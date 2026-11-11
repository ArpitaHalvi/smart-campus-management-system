from django.conf import settings
from django.db import models


class Faculty(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='faculty_profile'
    )

    employee_id = models.CharField(max_length=20, unique=True)

    department = models.ForeignKey(
        'academics.Department',
        on_delete=models.PROTECT,
        related_name='faculty_members'
    )

    designation = models.CharField(max_length=100)

    qualification = models.CharField(max_length=150, blank=True)

    specialization = models.CharField(max_length=150, blank=True)

    phone = models.CharField(max_length=20, blank=True)

    joining_date = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee_id} - {self.user.get_full_name()}"
