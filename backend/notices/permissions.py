from rest_framework.permissions import BasePermission
from accounts.models import User


class IsNoticeCreatorOrAdmin(BasePermission):
    """
    Allow only the admin or the faculty member who created the notice
    to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        if request.user.role == User.Role.FACULTY:
            return obj.created_by == request.user
        return False


class CanCreateNotice(BasePermission):
    """
    Allow only admin and faculty to create notices.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.Role.ADMIN, User.Role.FACULTY]
        )


class CanViewNotice(BasePermission):
    """
    Check if user has permission to view a notice based on audience.
    """

    def has_object_permission(self, request, view, obj):
        # If not published, only creator and admin can see
        if not obj.is_published:
            return (
                request.user.role == User.Role.ADMIN or
                obj.created_by == request.user
            )
        
        # If archived, only creator and admin can see
        if obj.is_archived:
            return (
                request.user.role == User.Role.ADMIN or
                obj.created_by == request.user
            )
        
        # If expired, don't show to regular users
        from django.utils import timezone
        if obj.expires_at and timezone.now() > obj.expires_at:
            return (
                request.user.role == User.Role.ADMIN or
                obj.created_by == request.user
            )
        
        # Admin and creator can always see
        if request.user.role == User.Role.ADMIN or obj.created_by == request.user:
            return True
        
        # Published notices are visible to all authenticated users by default
        if obj.is_published:
            return True
        
        return False
