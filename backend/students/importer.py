"""
Bulk student import from CSV.

Two steps, both stateless (the same file is sent each time):
  1. validate(...)  -> a row-by-row preview with every problem listed
  2. commit(...)    -> creates the valid rows; invalid rows are skipped

Every row is checked with the same rules as the registration form, plus
duplicate checks inside the file itself.
"""
import csv
import io
import os
import re
import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, transaction
from django.utils import timezone

from academics.models import AcademicYear, Course, Department, Section, Semester
from accounts.models import User

from .models import Student
from .serializers import StudentRegisterSerializer, next_enrollment_number

MAX_ROWS = 100           # password hashing is deliberately slow; keep a request short
MAX_BYTES = 1_000_000

REQUIRED = ('first_name', 'email')

# Canonical column -> the header spellings we accept (after normalising)
ALIASES = {
    'first_name': {'first_name', 'firstname', 'first', 'given_name'},
    'last_name': {'last_name', 'lastname', 'last', 'surname', 'family_name'},
    'email': {'email', 'email_address', 'e_mail', 'mail'},
    'username': {'username', 'user_name', 'login'},
    'password': {'password', 'initial_password'},
    'student_id': {'student_id', 'studentid', 'enrollment_number', 'enrollment_no',
                   'enrolment_number', 'enrolment_no', 'roll_no', 'roll_number'},
    'date_of_birth': {'date_of_birth', 'dob', 'birth_date', 'birthday'},
    'gender': {'gender', 'sex'},
    'phone': {'phone', 'mobile', 'phone_number', 'mobile_number', 'contact'},
    'address': {'address'},
    'guardian_name': {'guardian_name', 'guardian', 'parent_name', 'parent'},
    'guardian_phone': {'guardian_phone', 'guardian_mobile', 'parent_phone', 'parent_mobile'},
    'department': {'department', 'dept', 'branch'},
    'course': {'course', 'program', 'programme', 'degree'},
    'year_of_study': {'year_of_study', 'year', 'study_year'},
    'semester': {'semester', 'sem'},
    'section': {'section', 'sec', 'division'},
    'admission_date': {'admission_date', 'admitted', 'date_of_admission', 'joining_date'},
}
ALIAS_TO_COLUMN = {alias: col for col, names in ALIASES.items() for alias in names}

TEMPLATE_HEADER = [
    'first_name', 'last_name', 'email', 'student_id', 'department', 'course',
    'year_of_study', 'semester', 'section', 'admission_date', 'date_of_birth',
    'gender', 'phone', 'address', 'guardian_name', 'guardian_phone',
]
TEMPLATE_ROWS = [
    ['Asha', 'Menon', 'asha.menon@example.edu', '', 'Computer Science', 'B.Tech',
     '1', '1', 'A', '2026-08-01', '2008-05-14', 'female', '+91 98200 00001',
     '12 Park Street, Pune', 'R. Menon', '+91 98200 00002'],
    ['Vikram', 'Rao', 'vikram.rao@example.edu', '', 'Mechanical', 'B.Tech',
     '1', '1', 'B', '2026-08-01', '2007-11-02', 'male', '', '', '', ''],
]

GENDERS = {
    'm': 'MALE', 'male': 'MALE', 'f': 'FEMALE', 'female': 'FEMALE',
    'o': 'OTHER', 'other': 'OTHER',
}
DATE_FORMATS = ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y')

# Fields on the Student record, as the serializer names them
SERIALIZER_FIELD = {'student_id': 'enrollment_number'}


class ImportFileError(Exception):
    """The file as a whole can't be used (not row-level problems)."""


class ImportConflict(Exception):
    """A row clashed with something created while we were importing."""


def _normalise_header(name):
    return re.sub(r'[^a-z0-9]+', '_', name.strip().lower()).strip('_')


def parse_csv(uploaded):
    """Returns (rows, ignored_columns). Each row: {'row': line number, 'values': {...}}."""
    raw = uploaded.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ImportFileError('That file is larger than 1 MB.')
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise ImportFileError(
            'The file is not UTF-8. In Excel choose "CSV UTF-8" when saving.'
        )
    if not text.strip():
        raise ImportFileError('The file is empty.')

    # Excel in some regions saves with ; or tabs instead of commas
    first_line = text.splitlines()[0]
    delimiter = max(',;\t', key=first_line.count)

    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    try:
        header = next(reader)
    except StopIteration:
        raise ImportFileError('The file is empty.')

    column_for, ignored = {}, []
    for index, name in enumerate(header):
        canonical = ALIAS_TO_COLUMN.get(_normalise_header(name))
        if canonical is None:
            if name.strip():
                ignored.append(name.strip())
        elif canonical in column_for.values():
            raise ImportFileError(f'The column "{canonical}" appears more than once.')
        else:
            column_for[index] = canonical

    missing = [c for c in REQUIRED if c not in column_for.values()]
    if missing:
        raise ImportFileError(
            'Missing required column(s): ' + ', '.join(missing)
            + '. Download the template to see the expected headings.'
        )

    rows = []
    for fields in reader:
        if not any(f.strip() for f in fields):
            continue  # blank line
        values = {
            column: fields[i].strip() if i < len(fields) else ''
            for i, column in column_for.items()
        }
        rows.append({'row': reader.line_num, 'values': values})

    if not rows:
        raise ImportFileError('The file has headings but no students.')
    if len(rows) > MAX_ROWS:
        raise ImportFileError(
            f'A file can hold up to {MAX_ROWS} students at a time '
            f'(this one has {len(rows)}). Split it into smaller files.'
        )
    return rows, ignored


def _parse_date(value):
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _username_from(email, taken):
    base = re.sub(r'[^a-z0-9._-]', '', email.split('@')[0].lower()) or 'student'
    candidate, n = base, 1
    while candidate.lower() in taken:
        n += 1
        candidate = f'{base}{n}'
    return candidate


def _generate_password(length=12):
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    return ''.join(secrets.choice(chars) for _ in range(length))


class _Refs:
    """
    Looks up the academic records a CSV row names. Departments and courses are
    matched by name, a semester by its number in the current academic year, and
    a section by name within the row's course (and semester).
    """

    def __init__(self):
        self.departments = {d.name.lower(): d for d in Department.objects.all()}
        self.courses = {c.name.lower(): c for c in Course.objects.all()}
        self.year = AcademicYear.objects.filter(is_current=True).first()
        self.semesters = (
            {s.number: s for s in Semester.objects.filter(academic_year=self.year)}
            if self.year else {}
        )
        self.sections = list(Section.objects.select_related('semester'))

    def department(self, name):
        found = self.departments.get(name.strip().lower())
        if found:
            return found, None
        return None, f'"{name}" is not a department. Add it under Departments first.'

    def course(self, name):
        found = self.courses.get(name.strip().lower())
        if found:
            return found, None
        return None, f'"{name}" is not a course. Add it under Academics first.'

    def semester(self, number):
        if not number.strip().isdigit():
            return None, 'Use a semester number, e.g. 3.'
        if self.year is None:
            return None, 'No current academic year is set. Mark one under Academics.'
        found = self.semesters.get(int(number))
        if found:
            return found, None
        return None, f'Semester {number} does not exist in {self.year.name}. Add it under Academics.'

    def section(self, name, course, semester):
        if course is None:
            return None, 'A section needs a course on the same row.'
        same = [s for s in self.sections if s.course_id == course.id and s.name.lower() == name.strip().lower()]
        exact = [s for s in same if semester and s.semester_id == semester.id]
        general = [s for s in same if s.semester_id is None]
        found = (exact or general or [None])[0]
        if found:
            return found, None
        where = f' for {semester.name}' if semester else ''
        return None, f'Section {name} does not exist in {course.name}{where}. Add it under Academics.'


def validate(rows, request):
    """
    Checks every row. Returns a list of results:
      {'row', 'ok', 'errors': {field: message}, 'values': validated dict or None,
       'display': {...}}
    """
    taken_usernames = {u.lower() for u in User.objects.values_list('username', flat=True)}
    seen_emails, seen_ids, seen_usernames = {}, {}, {}
    refs = _Refs()
    results = []

    for item in rows:
        row, raw = item['row'], dict(item['values'])
        errors = {}

        # --- tidy up values the serializer would reject for harmless reasons
        for field in ('date_of_birth', 'admission_date'):
            if raw.get(field):
                parsed = _parse_date(raw[field])
                if parsed:
                    raw[field] = parsed
                else:
                    errors[field] = 'Use YYYY-MM-DD or DD/MM/YYYY.'
                    raw.pop(field)
        if raw.get('gender'):
            mapped = GENDERS.get(raw['gender'].lower())
            if mapped:
                raw['gender'] = mapped
            else:
                errors['gender'] = 'Use male, female or other.'
                raw.pop('gender')

        explicit_username = bool(raw.get('username'))
        if not explicit_username and raw.get('email'):
            raw['username'] = _username_from(raw['email'], taken_usernames | set(seen_usernames))
        generated = not raw.get('password')
        if generated:
            raw['password'] = _generate_password()

        # Turn the names in the file into the records they refer to
        found = {}
        for field, lookup in (('department', refs.department), ('course', refs.course), ('semester', refs.semester)):
            if raw.get(field):
                obj, problem = lookup(raw[field])
                if problem:
                    errors[field] = problem
                found[field] = obj
        if raw.get('section'):
            obj, problem = refs.section(raw['section'], found.get('course'), found.get('semester'))
            if problem and 'section' not in errors:
                errors['section'] = problem
            found['section'] = obj

        data = {
            SERIALIZER_FIELD.get(k, k): v
            for k, v in raw.items()
            if v != '' and k not in ('department', 'course', 'semester', 'section')
        }
        data.update({k: obj.id for k, obj in found.items() if obj is not None})
        serializer = StudentRegisterSerializer(data=data, context={'request': request})
        if not serializer.is_valid():
            for field, messages in serializer.errors.items():
                errors.setdefault(
                    'student_id' if field == 'enrollment_number' else field,
                    str(messages[0]),
                )

        # --- duplicates inside the file (first occurrence wins)
        email = raw.get('email', '').lower()
        username = raw.get('username', '').lower()
        student_id = raw.get('student_id', '').strip().upper()
        if email:
            if email in seen_emails and 'email' not in errors:
                errors['email'] = f'Same email as row {seen_emails[email]}.'
            seen_emails.setdefault(email, row)
        if username:
            if username in seen_usernames and 'username' not in errors:
                errors['username'] = f'Same username as row {seen_usernames[username]}.'
            seen_usernames.setdefault(username, row)
        if student_id:
            if student_id in seen_ids and 'student_id' not in errors:
                errors['student_id'] = f'Same student ID as row {seen_ids[student_id]}.'
            seen_ids.setdefault(student_id, row)

        ok = not errors
        results.append({
            'row': row,
            'ok': ok,
            'errors': errors,
            'values': dict(serializer.validated_data) if ok else None,
            'generated_password': generated,
            'display': {
                'name': f"{raw.get('first_name', '')} {raw.get('last_name', '')}".strip(),
                'email': raw.get('email', ''),
                'username': raw.get('username', ''),
                'student_id': student_id,
                'department': raw.get('department', ''),
                'year_of_study': raw.get('year_of_study', ''),
                'semester': raw.get('semester', ''),
                'section': raw.get('section', '').upper(),
            },
        })
    return results


def commit(results, created_by):
    """
    Creates every valid row in one transaction. Returns the login details of
    the new accounts (the only time their passwords are available).
    """
    good = [r for r in results if r['ok']]
    if not good:
        return []

    # Hashing is slow on purpose and releases the GIL, so do it in parallel
    passwords = [r['values']['password'] for r in good]
    with ThreadPoolExecutor(max_workers=min(len(good), os.cpu_count() or 4)) as pool:
        hashes = list(pool.map(make_password, passwords))

    # Student IDs: keep typed ones, number the rest consecutively
    typed = {r['values'].get('enrollment_number') for r in good} - {None, ''}
    prefix = f'SC{timezone.now().year}'
    counter = int(next_enrollment_number()[len(prefix):])

    def next_id():
        nonlocal counter
        while f'{prefix}{counter:04d}' in typed:
            counter += 1
        value = f'{prefix}{counter:04d}'
        counter += 1
        return value

    users, records = [], []
    for r, hashed in zip(good, hashes):
        v = dict(r['values'])
        v.pop('password')
        users.append(User(
            username=v.pop('username'),
            email=v.pop('email'),
            first_name=v.pop('first_name'),
            last_name=v.pop('last_name', ''),
            role=User.Role.STUDENT,
            password=hashed,
        ))
        v['enrollment_number'] = v.get('enrollment_number') or next_id()
        records.append(v)

    try:
        with transaction.atomic():
            users = User.objects.bulk_create(users)
            students = Student.objects.bulk_create([
                Student(user=user, created_by=created_by, **fields)
                for user, fields in zip(users, records)
            ])
    except IntegrityError:
        raise ImportConflict(
            'Someone registered a student at the same moment and it clashed with '
            'this file. Nothing was imported. Please try again.'
        )

    return [
        {
            'row': r['row'],
            'id': student.id,
            'name': r['display']['name'],
            'email': user.email,
            'username': user.username,
            'password': password,
            'student_id': student.enrollment_number,
        }
        for r, user, student, password in zip(good, users, students, passwords)
    ]
