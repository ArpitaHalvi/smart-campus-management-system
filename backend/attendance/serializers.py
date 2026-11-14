
from rest_framework import serializers

from .models import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceCorrection
)
from subjects.models import SubjectAllocation


class AttendanceSessionSerializer(serializers.ModelSerializer):

    class Meta:
        model = AttendanceSession
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

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

    class Meta:
        model = AttendanceRecord
        fields = '__all__'
        read_only_fields = ['id', 'marked_at']

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
