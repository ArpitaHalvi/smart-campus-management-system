from rest_framework.permissions import BasePermission

from .models import User


class HasRole(BasePermission):
    """Base class: allow only authenticated users whose role is in allowed_roles."""

    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role in self.allowed_roles
        )


class IsAdmin(HasRole):
    allowed_roles = (User.Role.ADMIN,)


class IsFaculty(HasRole):
    allowed_roles = (User.Role.FACULTY,)


class IsStudent(HasRole):
    allowed_roles = (User.Role.STUDENT,)


class IsAdminOrFaculty(HasRole):
    allowed_roles = (User.Role.ADMIN, User.Role.FACULTY)
