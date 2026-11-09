from django.db import transaction
from rest_framework import serializers

from accounts.models import User
from students.models import Student

from .models import AcademicYear, Course, Department, Section, Semester


def _active_count(obj):
    """Active students linked to this department, course or section."""
    annotated = getattr(obj, 'active_students', None)  # the list views annotate it
    if annotated is not None:
        return annotated
    return obj.students.filter(record_status=Student.RecordStatus.ACTIVE).count()


def _clean(value):
    return ' '.join(value.split())


class DepartmentSerializer(serializers.ModelSerializer):
    head = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.FACULTY, status=User.Status.ACTIVE),
        allow_null=True,
        required=False,
        error_messages={
            'does_not_exist': 'Choose an active faculty member.',
            'incorrect_type': 'Choose an active faculty member.',
        },
    )
    head_name = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'head', 'head_name',
                  'student_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'head_name', 'student_count', 'created_at', 'updated_at']

    def get_head_name(self, obj):
        if obj.head is None:
            return None
        return obj.head.get_full_name() or obj.head.username

    def get_student_count(self, obj):
        return _active_count(obj)

    def validate_name(self, value):
        value = _clean(value)
        if not value:
            raise serializers.ValidationError('Enter a department name.')
        taken = Department.objects.filter(name__iexact=value)
        if self.instance:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError('A department with this name already exists.')
        return value

    def validate_code(self, value):
        value = value.strip().upper()
        if value:
            taken = Department.objects.filter(code__iexact=value)
            if self.instance:
                taken = taken.exclude(pk=self.instance.pk)
            if taken.exists():
                raise serializers.ValidationError('Another department already uses this code.')
        return value


# ---------------------------------------------------------------- academic years
class AcademicYearSerializer(serializers.ModelSerializer):
    # Declared explicitly so DRF doesn't turn the database's "only one current"
    # constraint into a validator; making a year current demotes the old one instead.
    is_current = serializers.BooleanField(required=False, default=False)
    semester_count = serializers.SerializerMethodField()

    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_current',
                  'semester_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'semester_count', 'created_at', 'updated_at']

    def get_semester_count(self, obj):
        return obj.semesters.count()

    def validate_name(self, value):
        value = _clean(value)
        if not value:
            raise serializers.ValidationError('Enter a name, e.g. 2026-27.')
        taken = AcademicYear.objects.filter(name__iexact=value)
        if self.instance:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError('An academic year with this name already exists.')
        return value

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end:
            if end <= start:
                raise serializers.ValidationError({'end_date': 'The end date must be after the start date.'})
            others = AcademicYear.objects.filter(start_date__lte=end, end_date__gte=start)
            if self.instance:
                others = others.exclude(pk=self.instance.pk)
            clash = others.first()
            if clash:
                raise serializers.ValidationError(
                    {'start_date': f'These dates overlap with {clash.name}.'}
                )
            if self.instance:  # semesters already in this year must still fit
                outside = self.instance.semesters.filter(start_date__lt=start) | \
                    self.instance.semesters.filter(end_date__gt=end)
                first = outside.first()
                if first:
                    raise serializers.ValidationError({
                        'start_date': f'{first.name} would fall outside these dates. '
                                      'Adjust that semester first.'
                    })
        return attrs

    def _demote_others(self, validated_data, keep=None):
        """Making a year current makes every other year not current."""
        if validated_data.get('is_current'):
            others = AcademicYear.objects.filter(is_current=True)
            if keep is not None:
                others = others.exclude(pk=keep.pk)
            others.update(is_current=False)

    @transaction.atomic
    def create(self, validated_data):
        self._demote_others(validated_data)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        self._demote_others(validated_data, keep=instance)
        return super().update(instance, validated_data)


# ---------------------------------------------------------------- semesters
class SemesterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    section_count = serializers.SerializerMethodField()

    class Meta:
        model = Semester
        fields = ['id', 'academic_year', 'academic_year_name', 'number', 'name',
                  'start_date', 'end_date', 'section_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'name', 'academic_year_name', 'section_count',
                            'created_at', 'updated_at']
        validators = []  # the duplicate check in validate() gives a friendlier message

    def get_section_count(self, obj):
        return obj.sections.count()

    def validate_number(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError('Enter a semester number from 1 to 12.')
        return value

    def validate(self, attrs):
        get = lambda k: attrs.get(k, getattr(self.instance, k, None))
        year, number = get('academic_year'), get('number')
        start, end = get('start_date'), get('end_date')

        if year and number is not None:
            same = Semester.objects.filter(academic_year=year, number=number)
            if self.instance:
                same = same.exclude(pk=self.instance.pk)
            if same.exists():
                raise serializers.ValidationError(
                    {'number': f'Semester {number} already exists in {year.name}.'}
                )
        if start and end:
            if end <= start:
                raise serializers.ValidationError({'end_date': 'The end date must be after the start date.'})
            if year and (start < year.start_date or end > year.end_date):
                raise serializers.ValidationError({
                    'start_date': f'Dates must fall within {year.name} '
                                  f'({year.start_date:%d %b %Y} to {year.end_date:%d %b %Y}).'
                })
        return attrs


# ---------------------------------------------------------------- courses
class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'department', 'department_name',
                  'duration_years', 'description', 'student_count',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'department_name', 'student_count', 'created_at', 'updated_at']

    def get_student_count(self, obj):
        return _active_count(obj)

    def validate_name(self, value):
        value = _clean(value)
        if not value:
            raise serializers.ValidationError('Enter a course name.')
        taken = Course.objects.filter(name__iexact=value)
        if self.instance:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError('A course with this name already exists.')
        return value

    def validate_code(self, value):
        value = value.strip().upper()
        if value:
            taken = Course.objects.filter(code__iexact=value)
            if self.instance:
                taken = taken.exclude(pk=self.instance.pk)
            if taken.exists():
                raise serializers.ValidationError('Another course already uses this code.')
        return value

    def validate_duration_years(self, value):
        if value is not None and not 1 <= value <= 8:
            raise serializers.ValidationError('Enter a duration between 1 and 8 years.')
        return value


# ---------------------------------------------------------------- sections
class SectionSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    semester_label = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ['id', 'course', 'course_name', 'semester', 'semester_label',
                  'name', 'capacity', 'student_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'course_name', 'semester_label', 'student_count',
                            'created_at', 'updated_at']

    def get_semester_label(self, obj):
        if obj.semester is None:
            return None
        return f'{obj.semester.name} · {obj.semester.academic_year.name}'

    def get_student_count(self, obj):
        return _active_count(obj)

    def validate_name(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError('Enter a section name, e.g. A.')
        return value

    def validate_capacity(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError('Capacity must be at least 1.')
        return value

    def validate(self, attrs):
        get = lambda k: attrs.get(k, getattr(self.instance, k, None))
        course, semester, name = get('course'), get('semester'), get('name')
        if course and name:
            same = Section.objects.filter(course=course, semester=semester, name__iexact=name)
            if self.instance:
                same = same.exclude(pk=self.instance.pk)
            if same.exists():
                where = f'{semester.name} of {course.name}' if semester else course.name
                raise serializers.ValidationError(
                    {'name': f'Section {name} already exists in {where}.'}
                )
        return attrs
