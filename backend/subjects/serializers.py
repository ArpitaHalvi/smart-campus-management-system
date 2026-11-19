from rest_framework import serializers
from academics.models import Department, Semester, Section
from faculty.models import Faculty
from .models import Subject, SubjectAllocation


class DepartmentDetailSerializer(serializers.ModelSerializer):
    """Read-only nested department details for Subject."""
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'name', 'code']


class SemesterDetailSerializer(serializers.ModelSerializer):
    """Read-only nested semester details for Subject."""
    class Meta:
        model = Semester
        fields = ['id', 'number', 'academic_year']
        read_only_fields = ['id', 'number', 'academic_year']


class SectionDetailSerializer(serializers.ModelSerializer):
    """Read-only nested section details for Subject."""
    class Meta:
        model = Section
        fields = ['id', 'name', 'course', 'semester']
        read_only_fields = ['id', 'name', 'course', 'semester']


class FacultyDetailSerializer(serializers.ModelSerializer):
    """Read-only nested faculty details for SubjectAllocation."""
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = Faculty
        fields = ['id', 'employee_id', 'user_details']
        read_only_fields = ['id', 'employee_id', 'user_details']

    def get_user_details(self, obj):
        return {
            'id': obj.user.id,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email,
        }


class SubjectSerializer(serializers.ModelSerializer):
    department_details = DepartmentDetailSerializer(source='department', read_only=True)
    semester_details = SemesterDetailSerializer(source='semester', read_only=True)
    section_details = SectionDetailSerializer(source='section', read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id',
            'name',
            'code',
            'description',
            'department',
            'department_details',
            'semester',
            'semester_details',
            'section',
            'section_details',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'department_details', 'semester_details', 'section_details', 'created_at', 'updated_at']



class SubjectDetailSerializer(serializers.ModelSerializer):
    """Read-only nested subject details for SubjectAllocation."""
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'name', 'code']


class SubjectAllocationSerializer(serializers.ModelSerializer):
    subject_details = SubjectDetailSerializer(source='subject', read_only=True)
    faculty_details = FacultyDetailSerializer(source='faculty', read_only=True)

    class Meta:
        model = SubjectAllocation
        fields = [
            'id',
            'subject',
            'subject_details',
            'faculty',
            'faculty_details',
            'created_at',
        ]
        read_only_fields = ['id', 'subject_details', 'faculty_details', 'created_at']

    def validate(self, data):
        subject = data.get('subject', self.instance.subject if self.instance else None)
        faculty = data.get('faculty', self.instance.faculty if self.instance else None)

        if subject and not subject.is_active:
            raise serializers.ValidationError(
                "Cannot assign an inactive subject."
            )

        if faculty and not faculty.is_active:
            raise serializers.ValidationError(
                "Cannot assign an inactive faculty member."
            )

        existing = SubjectAllocation.objects.filter(
            subject=subject,
            faculty=faculty
        )

        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        if existing.exists():
            raise serializers.ValidationError(
                "This faculty member is already assigned to this subject."
            )

        return data