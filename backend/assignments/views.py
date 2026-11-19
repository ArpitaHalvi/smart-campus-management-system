from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count
from django.http import FileResponse

from accounts.models import User
from accounts.permissions import IsAdmin, IsAdminOrFaculty
from students.models import Student

from .models import Assignment, AssignmentSubmission
from .serializers import (
    AssignmentSerializer,
    AssignmentDetailSerializer,
    AssignmentSubmissionSerializer,
    StudentSubmissionListSerializer,
    SubmissionListForFacultySerializer,
    SubmissionEvaluationSerializer,
)
from .permissions import (
    IsAssignmentCreator,
    CanSubmitAssignment,
    CanViewSubmission,
    CanEvaluateSubmission,
    IsStudentInSection,
)


class AssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Assignment management.
    
    Faculty can create, edit, delete assignments for their sections.
    Students can view assignments for their sections.
    Admin can view all assignments.
    """

    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        """Filter assignments based on user role."""
        user = self.request.user
        
        if user.role == User.Role.ADMIN:
            # Admin sees all non-archived
            return Assignment.objects.filter(
                is_archived=False
            ).select_related(
                'semester', 'section', 'created_by'
            ).prefetch_related('submissions')
        
        elif user.role == User.Role.FACULTY:
            # Faculty sees their own non-archived assignments
            return Assignment.objects.filter(
                created_by=user,
                is_archived=False
            ).select_related('semester', 'section', 'created_by')
        
        elif user.role == User.Role.STUDENT:
            # Students see only published, non-archived assignments for their section
            if not hasattr(user, 'student_profile'):
                return Assignment.objects.none()
            
            student = user.student_profile
            return Assignment.objects.filter(
                is_published=True,
                is_archived=False,
                section=student.section
            ).select_related('semester', 'section', 'created_by')
        
        return Assignment.objects.none()

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action."""
        if self.action == 'retrieve':
            return AssignmentDetailSerializer
        return AssignmentSerializer

    def perform_create(self, serializer):
        """Set created_by to current user (must be faculty)."""
        if self.request.user.role != User.Role.FACULTY:
            raise PermissionError('Only faculty can create assignments.')
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        """Only assignment creator can update."""
        if serializer.instance.created_by != self.request.user:
            raise PermissionError('Only the creator can update this assignment.')
        serializer.save()

    def perform_destroy(self, instance):
        """Only assignment creator can delete (soft delete via archive)."""
        if instance.created_by != self.request.user and self.request.user.role != User.Role.ADMIN:
            raise PermissionError('Only the creator can delete this assignment.')
        instance.is_archived = True
        instance.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def publish(self, request, pk=None):
        """Publish an assignment (make visible to students)."""
        assignment = self.get_object()
        
        if assignment.created_by != request.user and request.user.role != User.Role.ADMIN:
            return Response(
                {'detail': 'Only the creator can publish this assignment.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignment.is_published = True
        assignment.save()
        
        return Response(
            {'detail': 'Assignment published successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unpublish(self, request, pk=None):
        """Unpublish an assignment (hide from students)."""
        assignment = self.get_object()
        
        if assignment.created_by != request.user and request.user.role != User.Role.ADMIN:
            return Response(
                {'detail': 'Only the creator can unpublish this assignment.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignment.is_published = False
        assignment.save()
        
        return Response(
            {'detail': 'Assignment unpublished successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def submissions(self, request, pk=None):
        """Get all submissions for an assignment (faculty only)."""
        assignment = self.get_object()
        
        if request.user.role == User.Role.FACULTY and assignment.created_by != request.user:
            return Response(
                {'detail': 'You can only view submissions for your own assignments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.user.role == User.Role.STUDENT:
            return Response(
                {'detail': 'Students cannot view all submissions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        submissions = assignment.submissions.select_related('student__user').order_by('-submitted_at')
        serializer = SubmissionListForFacultySerializer(submissions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def submission_stats(self, request, pk=None):
        """Get submission statistics for an assignment."""
        assignment = self.get_object()
        
        if request.user.role == User.Role.FACULTY and assignment.created_by != request.user:
            return Response(
                {'detail': 'You can only view stats for your own assignments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        submissions = assignment.submissions.all()
        stats = {
            'total': submissions.count(),
            'submitted': submissions.filter(status__in=['submitted', 'late', 'evaluated']).count(),
            'pending': submissions.filter(status='pending').count(),
            'late': submissions.filter(status='late').count(),
            'evaluated': submissions.filter(status='evaluated').count(),
            'average_marks': None,
        }
        
        evaluated = submissions.filter(status='evaluated', marks_obtained__isnull=False)
        if evaluated.exists():
            avg = sum(sub.marks_obtained for sub in evaluated) / evaluated.count()
            stats['average_marks'] = round(avg, 2)
        
        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def download_attachment(self, request, pk=None):
        """Download assignment attachment file."""
        assignment = self.get_object()
        
        if not assignment.attachment:
            return Response(
                {'detail': 'This assignment has no attachment.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        file = assignment.attachment.open('rb')
        response = FileResponse(file, as_attachment=True)
        response['Content-Disposition'] = f'attachment; filename="{assignment.attachment.name}"'
        return response


class SubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling student submissions.
    
    Students can submit, view their own submissions.
    Faculty can view and grade submissions for their assignments.
    Admin can view all submissions.
    """

    serializer_class = AssignmentSubmissionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        """Filter submissions based on user role."""
        user = self.request.user
        
        if user.role == User.Role.ADMIN:
            return AssignmentSubmission.objects.select_related(
                'assignment', 'student__user'
            )
        
        elif user.role == User.Role.FACULTY:
            # Faculty sees submissions for their assignments
            return AssignmentSubmission.objects.filter(
                assignment__created_by=user
            ).select_related('assignment', 'student__user')
        
        elif user.role == User.Role.STUDENT:
            # Students see only their own submissions
            if not hasattr(user, 'student_profile'):
                return AssignmentSubmission.objects.none()
            return AssignmentSubmission.objects.filter(
                student__user=user
            ).select_related('assignment', 'student__user')
        
        return AssignmentSubmission.objects.none()

    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'list' and self.request.user.role == User.Role.STUDENT:
            return StudentSubmissionListSerializer
        elif self.action in ['evaluate', 'partial_update']:
            return SubmissionEvaluationSerializer
        return AssignmentSubmissionSerializer

    def create(self, request, *args, **kwargs):
        """Handle student submission creation."""
        if request.user.role != User.Role.STUDENT:
            return Response(
                {'detail': 'Only students can submit assignments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'detail': 'Student profile not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignment_id = request.data.get('assignment')
        if not assignment_id:
            return Response(
                {'detail': 'assignment ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignment = get_object_or_404(Assignment, id=assignment_id)
        student = request.user.student_profile
        
        # Check if student is in the section
        if student.section != assignment.section:
            return Response(
                {'detail': 'You are not enrolled in this section.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if assignment is open
        if not assignment.is_published:
            return Response(
                {'detail': 'This assignment has not been published yet.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if submission already exists (unless resubmission allowed)
        existing = AssignmentSubmission.objects.filter(
            assignment=assignment,
            student=student
        ).first()
        
        if existing and existing.status != 'pending' and not assignment.allow_resubmission:
            return Response(
                {'detail': 'You have already submitted this assignment. Resubmission is not allowed.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if existing:
            # Update existing submission
            existing.submission_file = request.FILES.get('submission_file', existing.submission_file)
            existing.submitted_at = timezone.now()
            existing.revised_at = timezone.now()
            existing.status = 'submitted' if timezone.now() <= assignment.deadline else 'late'
            existing.save()
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        # Create new submission
        serializer = self.get_serializer(data=request.data)
        serializer.initial_data['student'] = student.id
        serializer.initial_data['submitted_at'] = timezone.now()
        
        if serializer.is_valid():
            submission = serializer.save(student=student)
            submission.submitted_at = timezone.now()
            submission.status = 'submitted' if timezone.now() <= assignment.deadline else 'late'
            submission.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def evaluate(self, request, pk=None):
        """Grade a submission (faculty only)."""
        submission = self.get_object()
        
        if request.user.role != User.Role.FACULTY or submission.assignment.created_by != request.user:
            return Response(
                {'detail': 'Only the assignment creator can evaluate submissions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = SubmissionEvaluationSerializer(
            submission,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'detail': 'Submission evaluated successfully.'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def download_submission(self, request, pk=None):
        """Download submission file."""
        submission = self.get_object()
        
        if not submission.submission_file:
            return Response(
                {'detail': 'This submission has no file.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Permission check
        if (request.user.role == User.Role.FACULTY and submission.assignment.created_by != request.user) or \
           (request.user.role == User.Role.STUDENT and submission.student.user != request.user):
            return Response(
                {'detail': 'You do not have permission to download this file.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file = submission.submission_file.open('rb')
        response = FileResponse(file, as_attachment=True)
        response['Content-Disposition'] = f'attachment; filename="{submission.submission_file.name}"'
        return response

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_submissions(self, request):
        """Get current student's submissions."""
        if request.user.role != User.Role.STUDENT:
            return Response(
                {'detail': 'Only students can view their own submissions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not hasattr(request.user, 'student_profile'):
            return Response([], status=status.HTTP_200_OK)
        
        submissions = self.get_queryset()
        serializer = StudentSubmissionListSerializer(submissions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
