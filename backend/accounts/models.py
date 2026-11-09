from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        # Superusers made via `createsuperuser` are campus admins
        extra_fields.setdefault('role', 'ADMIN')
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):

    objects = CustomUserManager()

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        FACULTY = 'FACULTY', 'Faculty'
        STUDENT = 'STUDENT', 'Student'

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT
    )

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'      # temporary, can be lifted
        INACTIVE = 'INACTIVE', 'Deactivated'      # switched off

    # `status` is the source of truth; `is_active` (which Django checks at
    # login) is derived from it in save().
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    status_reason = models.CharField(max_length=255, blank=True)

    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        self.is_active = self.status == self.Status.ACTIVE
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} - {self.role}"