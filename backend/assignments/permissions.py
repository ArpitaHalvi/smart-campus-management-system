from rest_framework.permissions import BasePermission
from accounts.models import User


class IsAssignmentCreator(BasePermission):
    """
    Allow only the faculty member who created the assignment
    to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role != User.Role.FACULTY:
            return False
        return obj.created_by == request.user


class CanSubmitAssignment(BasePermission):
    """
    Allow only authenticated students to submit assignments.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.STUDENT
        )


class CanViewSubmission(BasePermission):
    """
    Students can view their own submissions.
    Faculty can view submissions for assignments they created.
    Admin can view all submissions.
    """

    def has_object_permission(self, request, view, obj):
        # Admin can view everything
        if request.user.role == User.Role.ADMIN:
            return True
        
        # Faculty can view submissions for their assignments
        if request.user.role == User.Role.FACULTY:
            return obj.assignment.created_by == request.user
        
        # Students can view their own submissions
        if request.user.role == User.Role.STUDENT:
            return obj.student.user == request.user
        
        return False


class CanEvaluateSubmission(BasePermission):
    """
    Allow only the faculty member who created the assignment
    to evaluate and grade submissions.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role != User.Role.FACULTY:
            return False
        return obj.assignment.created_by == request.user


class IsStudentInSection(BasePermission):
    """
    Check if the student is enrolled in the section.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.STUDENT and
            hasattr(request.user, 'student_profile')
        )

    def has_object_permission(self, request, view, obj):
        if not hasattr(request.user, 'student_profile'):
            return False
        
        student = request.user.student_profile
        # Check if student is in the same section as assignment
        return student.section == obj.section
