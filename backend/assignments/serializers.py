from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from .models import Assignment, AssignmentSubmission


class AssignmentSerializer(serializers.ModelSerializer):
    """Serializer for Assignment listing and creation by faculty."""

    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    semester_label = serializers.CharField(
        source='semester.__str__',
        read_only=True
    )
    section_name = serializers.CharField(
        source='section.name',
        read_only=True
    )
    submission_count = serializers.SerializerMethodField()
    is_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'semester', 'semester_label',
            'section', 'section_name', 'subject_name', 'deadline',
            'max_marks', 'attachment', 'is_published', 'is_archived',
            'allow_resubmission', 'created_by', 'created_by_name',
            'submission_count', 'is_open', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'semester_label',
            'section_name', 'submission_count', 'created_at', 'updated_at'
        ]

    def get_submission_count(self, obj):
        """Count total submissions for this assignment."""
        return obj.submissions.count()

    def validate_deadline(self, value):
        """Ensure deadline is in the future."""
        if value <= timezone.now():
            raise serializers.ValidationError(
                'Deadline must be in the future.'
            )
        return value

    def validate_max_marks(self, value):
        """Ensure max_marks is positive."""
        if value <= 0:
            raise serializers.ValidationError(
                'Maximum marks must be greater than 0.'
            )
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        # Ensure semester and section are related
        semester = attrs.get('semester')
        section = attrs.get('section')
        
        if semester and section:
            # Section must be in the same academic year as semester
            if section.semester and section.semester != semester:
                raise serializers.ValidationError({
                    'section': 'Section must belong to the selected semester.'
                })
        
        return attrs


class AssignmentDetailSerializer(AssignmentSerializer):
    """Extended serializer for assignment detail view."""

    submission_stats = serializers.SerializerMethodField()

    class Meta(AssignmentSerializer.Meta):
        fields = AssignmentSerializer.Meta.fields + ['submission_stats']

    def get_submission_stats(self, obj):
        """Get submission statistics."""
        submissions = obj.submissions.all()
        return {
            'total': submissions.count(),
            'submitted': submissions.filter(status__in=['submitted', 'late', 'evaluated']).count(),
            'pending': submissions.filter(status='pending').count(),
            'late': submissions.filter(status='late').count(),
            'evaluated': submissions.filter(status='evaluated').count(),
        }


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for student submissions."""

    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True
    )
    enrollment_number = serializers.CharField(
        source='student.enrollment_number',
        read_only=True
    )
    assignment_title = serializers.CharField(
        source='assignment.title',
        read_only=True
    )
    is_late = serializers.SerializerMethodField()
    days_late = serializers.IntegerField(read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'assignment_title', 'student', 'student_name',
            'enrollment_number', 'submission_file', 'submitted_at', 'status',
            'marks_obtained', 'feedback', 'feedback_visible', 'is_late',
            'days_late', 'revised_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'student_name', 'enrollment_number',
            'assignment_title', 'is_late', 'days_late', 'created_at', 'updated_at'
        ]

    def get_is_late(self, obj):
        """Check if submission is late."""
        return obj.status == 'late'

    def validate_submission_file(self, value):
        """Validate file type and size."""
        if value:
            # Check file size (max 10MB)
            if value.size > 10 * 1024 * 1024:  # 10MB
                raise serializers.ValidationError(
                    'File size must not exceed 10MB.'
                )
            
            # Check file type
            allowed_extensions = ['.pdf', '.doc', '.docx', '.txt', '.zip']
            file_ext = value.name.lower()
            if not any(file_ext.endswith(ext) for ext in allowed_extensions):
                raise serializers.ValidationError(
                    f'File type not allowed. Allowed types: {", ".join(allowed_extensions)}'
                )
        
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        if self.instance:
            # Allow update only if assignment is open or if feedback visible
            assignment = self.instance.assignment
            if not assignment.is_open:
                if not self.context.get('allow_edit'):
                    raise serializers.ValidationError(
                        'Cannot modify submission after deadline.'
                    )
        
        return attrs


class StudentSubmissionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for student viewing their own submissions."""

    assignment_title = serializers.CharField(
        source='assignment.title',
        read_only=True
    )
    deadline = serializers.DateTimeField(
        source='assignment.deadline',
        read_only=True
    )
    max_marks = serializers.IntegerField(
        source='assignment.max_marks',
        read_only=True
    )
    is_late = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'assignment_title', 'deadline', 'max_marks',
            'submitted_at', 'status', 'marks_obtained', 'feedback',
            'feedback_visible', 'is_late'
        ]
        read_only_fields = fields

    def get_is_late(self, obj):
        """Check if submission is late."""
        return obj.status == 'late'


class SubmissionListForFacultySerializer(serializers.ModelSerializer):
    """Serializer for faculty viewing all submissions for an assignment."""

    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True
    )
    enrollment_number = serializers.CharField(
        source='student.enrollment_number',
        read_only=True
    )
    max_marks = serializers.IntegerField(
        source='assignment.max_marks',
        read_only=True
    )
    is_late = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'student', 'student_name', 'enrollment_number',
            'submitted_at', 'status', 'marks_obtained', 'max_marks', 'is_late'
        ]
        read_only_fields = fields

    def get_is_late(self, obj):
        return obj.status == 'late'


class SubmissionEvaluationSerializer(serializers.ModelSerializer):
    """Serializer for faculty grading submissions."""

    class Meta:
        model = AssignmentSubmission
        fields = ['id', 'marks_obtained', 'feedback', 'feedback_visible']

    def validate_marks_obtained(self, value):
        """Ensure marks don't exceed max_marks."""
        if value is not None:
            # Convert string to int/float if needed
            try:
                value = int(value) if isinstance(value, str) else value
            except (ValueError, TypeError):
                raise serializers.ValidationError('Marks must be a number.')
            
            max_marks = self.instance.assignment.max_marks
            if value > max_marks:
                raise serializers.ValidationError(
                    f'Marks cannot exceed {max_marks}.'
                )
            if value < 0:
                raise serializers.ValidationError(
                    'Marks cannot be negative.'
                )
        return value

    def update(self, instance, validated_data):
        """Update submission with evaluation data."""
        marks = validated_data.get('marks_obtained', instance.marks_obtained)
        
        # Convert string to int if needed
        if isinstance(marks, str):
            try:
                marks = int(marks)
            except (ValueError, TypeError):
                marks = instance.marks_obtained
        
        instance.marks_obtained = marks
        instance.feedback = validated_data.get('feedback', instance.feedback)
        instance.feedback_visible = validated_data.get('feedback_visible', instance.feedback_visible)
        
        # Auto-set status to evaluated if marks are assigned
        if instance.marks_obtained is not None:
            instance.status = 'evaluated'
        
        instance.save()
        return instance
