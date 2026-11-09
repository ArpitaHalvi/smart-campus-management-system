from datetime import date

from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from academics.models import Course, Department, Section, Semester
from accounts.models import User
from accounts.serializers import clean_unique_email

from .models import Student

# Fields that belong to the Student record (not the login account)
PLAIN_FIELDS = [
    'enrollment_number', 'date_of_birth', 'gender', 'phone', 'address',
    'guardian_name', 'guardian_phone', 'year_of_study', 'admission_date',
]
# The academic links: each is the id of a row in its own table
LINK_FIELDS = ['department', 'course', 'semester', 'section']
RECORD_FIELDS = PLAIN_FIELDS + LINK_FIELDS


def next_enrollment_number():
    """
    The next free student ID: SC<year><4-digit sequence>, e.g. SC20260007.

    It continues from the highest number already issued this year, so archived
    students and hand-typed IDs can never cause a clash. The database's unique
    constraint is the final guard (see StudentRegisterSerializer.create).
    """
    prefix = f'SC{timezone.now().year}'
    highest = 0
    for number in Student.objects.filter(
        enrollment_number__startswith=prefix
    ).values_list('enrollment_number', flat=True):
        suffix = number[len(prefix):]
        if suffix.isdigit():
            highest = max(highest, int(suffix))
    return f'{prefix}{highest + 1:04d}'


def _link(model, label):
    """An optional foreign key sent as an id, with friendly errors."""
    return serializers.PrimaryKeyRelatedField(
        queryset=model.objects.all(),
        allow_null=True,
        required=False,
        error_messages={
            'does_not_exist': f'Choose an existing {label}.',
            'incorrect_type': f'Choose an existing {label}.',
        },
    )


def check_academic_consistency(course, semester, section):
    """
    A section belongs to one course (and maybe one semester); a student's course
    and semester must agree with the section they are placed in.
    """
    if section is None:
        return
    if course is not None and section.course_id != course.id:
        raise serializers.ValidationError({
            'section': f'Section {section.name} belongs to {section.course.name}, not {course.name}.'
        })
    if semester is not None and section.semester_id and section.semester_id != semester.id:
        raise serializers.ValidationError({
            'section': f'Section {section.name} is for {section.semester.name} of '
                       f'{section.semester.academic_year.name}, not the chosen semester.'
        })


class StudentSerializer(serializers.ModelSerializer):
    """The complete profile: account details plus the student record."""

    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    account_status = serializers.CharField(source='user.status', read_only=True)
    last_login = serializers.DateTimeField(source='user.last_login', read_only=True)

    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    course_name = serializers.CharField(source='course.name', read_only=True, default=None)
    course_duration_years = serializers.IntegerField(source='course.duration_years', read_only=True, default=None)
    section_name = serializers.CharField(source='section.name', read_only=True, default=None)
    semester_number = serializers.IntegerField(source='semester.number', read_only=True, default=None)
    semester_name = serializers.CharField(source='semester.name', read_only=True, default=None)
    semester_start = serializers.DateField(source='semester.start_date', read_only=True, default=None)
    semester_end = serializers.DateField(source='semester.end_date', read_only=True, default=None)
    academic_year = serializers.IntegerField(source='semester.academic_year_id', read_only=True, default=None)
    academic_year_name = serializers.CharField(source='semester.academic_year.name', read_only=True, default=None)

    class Meta:
        model = Student
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'account_status', 'last_login',
            *RECORD_FIELDS,
            'department_name', 'course_name', 'course_duration_years',
            'section_name', 'semester_number', 'semester_name',
            'semester_start', 'semester_end', 'academic_year', 'academic_year_name',
            'record_status', 'archived_at', 'archive_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class _RecordValidation(serializers.Serializer):
    """Checks shared by registering and updating a student."""

    department = _link(Department, 'department')
    course = _link(Course, 'course')
    semester = _link(Semester, 'semester')
    section = _link(Section, 'section')

    def validate_date_of_birth(self, value):
        if value and value >= date.today():
            raise serializers.ValidationError('Date of birth must be in the past.')
        return value

    def validate_year_of_study(self, value):
        if value is not None and not 1 <= value <= 8:
            raise serializers.ValidationError('Enter a year between 1 and 8.')
        return value

    def validate(self, attrs):
        current = self.instance
        pick = lambda k: attrs[k] if k in attrs else getattr(current, k, None)
        course, semester, section = pick('course'), pick('semester'), pick('section')
        check_academic_consistency(course, semester, section)

        # Choosing a section fills in what it already implies
        if section is not None:
            if course is None:
                attrs['course'] = section.course
            if semester is None and section.semester_id:
                attrs['semester'] = section.semester
        return attrs


class StudentRegisterSerializer(_RecordValidation, serializers.ModelSerializer):
    """Register a student: creates the login account and the record together."""

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    enrollment_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    class Meta:
        model = Student
        fields = [
            'id', 'username', 'email', 'password', 'first_name', 'last_name',
            *RECORD_FIELDS,
        ]
        read_only_fields = ['id']

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return value

    def validate_email(self, value):
        return clean_unique_email(value)

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_enrollment_number(self, value):
        value = value.strip().upper()
        if value and Student.objects.filter(enrollment_number__iexact=value).exists():
            raise serializers.ValidationError('That enrollment number is already in use.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data.pop('username'),
            email=validated_data.pop('email'),
            password=validated_data.pop('password'),
            first_name=validated_data.pop('first_name'),
            last_name=validated_data.pop('last_name', ''),
            role=User.Role.STUDENT,
        )
        created_by = self.context['request'].user
        if validated_data.get('enrollment_number'):
            return Student.objects.create(user=user, created_by=created_by, **validated_data)

        # Auto-generated ID: if two registrations race for the same number the
        # unique constraint rejects one, which simply takes the next number.
        for _ in range(5):
            validated_data['enrollment_number'] = next_enrollment_number()
            try:
                with transaction.atomic():
                    return Student.objects.create(
                        user=user, created_by=created_by, **validated_data
                    )
            except IntegrityError:
                continue
        raise serializers.ValidationError(
            {'enrollment_number': 'Could not generate a student ID. Please try again.'}
        )


class StudentUpdateSerializer(_RecordValidation, serializers.ModelSerializer):
    """Edit a student's details. Username and password are not editable here."""

    first_name = serializers.CharField(source='user.first_name', max_length=150, required=False)
    last_name = serializers.CharField(source='user.last_name', max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(source='user.email', required=False)

    class Meta:
        model = Student
        fields = ['first_name', 'last_name', 'email', *RECORD_FIELDS]

    def validate_first_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Enter a first name.')
        return value

    def validate_email(self, value):
        return clean_unique_email(value, exclude_pk=self.instance.user_id)

    def validate_enrollment_number(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError('Enter an enrollment number.')
        taken = Student.objects.filter(enrollment_number__iexact=value)
        if taken.exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('That enrollment number is already in use.')
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        if user_data:
            for attr, value in user_data.items():
                setattr(instance.user, attr, value)
            instance.user.save()
        return super().update(instance, validated_data)


class ArchiveSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)


class EnrollSerializer(serializers.Serializer):
    """
    Assign students to a department, course, year, semester and/or section.
    Name the students either by `student_ids` or by `filters` (everyone who
    matches a list view). Only the fields you send are changed. The academic
    fields are ids of records under Academics.
    """

    student_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, max_length=1000
    )
    filters = serializers.DictField(
        child=serializers.CharField(allow_blank=True), required=False
    )
    department = _link(Department, 'department')
    course = _link(Course, 'course')
    semester = _link(Semester, 'semester')
    section = _link(Section, 'section')
    year_of_study = serializers.IntegerField(min_value=1, max_value=8, required=False)

    def validate(self, attrs):
        if bool(attrs.get('student_ids')) == bool('filters' in attrs):
            raise serializers.ValidationError('Send either student_ids or filters.')
        keys = ('department', 'course', 'year_of_study', 'semester', 'section')
        if not any(attrs.get(k) is not None for k in keys):
            raise serializers.ValidationError(
                'Choose at least one thing to assign: department, course, year, semester or section.'
            )
        # A section carries its course (and maybe semester); don't contradict it
        section, course, semester = attrs.get('section'), attrs.get('course'), attrs.get('semester')
        check_academic_consistency(course, semester, section)
        return attrs
