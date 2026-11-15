from rest_framework.permissions import BasePermission
from accounts.models import User


class IsEventOrganizerOrAdmin(BasePermission):
    """
    Allow only the organizer or admin to edit/delete events.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        if request.user.role == User.Role.FACULTY:
            return obj.organizer == request.user
        return False


class CanCreateEvent(BasePermission):
    """
    Allow only admin and faculty to create events.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [User.Role.ADMIN, User.Role.FACULTY]
        )


class CanRegisterEvent(BasePermission):
    """
    Allow only authenticated students to register for events.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.STUDENT and
            hasattr(request.user, 'student_profile')
        )


class CanViewEventRegistrations(BasePermission):
    """
    Allow event organizer or admin to view registrations.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        if request.user.role == User.Role.FACULTY:
            return obj.event.organizer == request.user
        return False
