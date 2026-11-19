from rest_framework import serializers
from academics.models import Section
from subjects.models import Subject, SubjectAllocation
from faculty.models import Faculty
from students.models import Student

from .models import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceCorrection
)


class SubjectDetailSerializer(serializers.ModelSerializer):
    """Read-only nested subject details."""
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'name', 'code']


class SectionDetailSerializer(serializers.ModelSerializer):
    """Read-only nested section details."""
    class Meta:
        model = Section
        fields = ['id', 'name']
        read_only_fields = ['id', 'name']


class FacultyDetailSerializer(serializers.ModelSerializer):
    """Read-only nested faculty details."""
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
        }


class StudentDetailSerializer(serializers.ModelSerializer):
    """Read-only nested student details."""
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'enrollment_number', 'user_details']
        read_only_fields = ['id', 'enrollment_number', 'user_details']

    def get_user_details(self, obj):
        return {
            'id': obj.user.id,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
        }


class AttendanceSessionDetailSerializer(serializers.ModelSerializer):
    """Minimal session details for records."""
    class Meta:
        model = AttendanceSession
        fields = ['id', 'attendance_date', 'session_number']
        read_only_fields = ['id', 'attendance_date', 'session_number']


class AttendanceSessionSerializer(serializers.ModelSerializer):
    subject_details = SubjectDetailSerializer(source='subject', read_only=True)
    section_details = SectionDetailSerializer(source='section', read_only=True)
    faculty_details = FacultyDetailSerializer(source='faculty', read_only=True)

    class Meta:
        model = AttendanceSession
        fields = [
            'id',
            'subject',
            'subject_details',
            'section',
            'section_details',
            'faculty',
            'faculty_details',
            'attendance_date',
            'session_number',
            'created_at',
        ]
        read_only_fields = ['id', 'subject_details', 'section_details', 'faculty_details', 'created_at']

    def validate(self, data):
        subject = data.get(
            'subject',
            self.instance.subject if self.instance else None
        )
        section = data.get(
            'section',
            self.instance.section if self.instance else None
        )
        faculty = data.get(
            'faculty',
            self.instance.faculty if self.instance else None
        )
        session_number = data.get(
            'session_number',
            self.instance.session_number if self.instance else 1
        )

        if session_number < 1:
            raise serializers.ValidationError(
                "Session number must be at least 1."
            )

        if subject and not subject.is_active:
            raise serializers.ValidationError(
                "Cannot create attendance for an inactive subject."
            )

        if faculty and not faculty.is_active:
            raise serializers.ValidationError(
                "Inactive faculty cannot take attendance."
            )

        if subject and section and subject.section_id != section.id:
            raise serializers.ValidationError(
                "The selected section does not belong to this subject."
            )

        if subject and faculty:
            allocation_exists = SubjectAllocation.objects.filter(
                subject=subject,
                faculty=faculty
            ).exists()

            if not allocation_exists:
                raise serializers.ValidationError(
                    "This faculty member is not allocated to this subject."
                )

        return data


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_details = StudentDetailSerializer(source='student', read_only=True)
    session_details = AttendanceSessionDetailSerializer(source='session', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id',
            'session',
            'session_details',
            'student',
            'student_details',
            'status',
            'remarks',
            'marked_at',
        ]
        read_only_fields = ['id', 'student_details', 'session_details', 'marked_at']

    def validate(self, data):
        session = data.get(
            'session',
            self.instance.session if self.instance else None
        )
        student = data.get(
            'student',
            self.instance.student if self.instance else None
        )

        if student:
            if student.record_status != 'ACTIVE':
                raise serializers.ValidationError(
                    "Attendance cannot be marked for an archived student."
                )

        if session and student:
            if student.section_id != session.section_id:
                raise serializers.ValidationError(
                    "Student does not belong to this session's section."
                )

        return data


class AttendanceCorrectionSerializer(serializers.ModelSerializer):

    class Meta:
        model = AttendanceCorrection
        fields = '__all__'
        read_only_fields = ['id', 'corrected_at']
