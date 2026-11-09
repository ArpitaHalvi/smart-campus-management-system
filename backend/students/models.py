from django.conf import settings
from django.db import models


class Student(models.Model):
    """
    A student's academic and personal record. Every student also has a login
    account (`user`, role STUDENT); the two are created together.

    Records are never deleted. Archiving hides a record and switches the
    account off, and can be undone.
    """

    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    class RecordStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        ARCHIVED = 'ARCHIVED', 'Archived'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_profile',
    )
    enrollment_number = models.CharField(max_length=20, unique=True)

    # Personal
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    guardian_name = models.CharField(max_length=120, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)

    # Academic. These point at the real academic records (department_id,
    # course_id, semester_id, section_id), so a rename in one place is
    # reflected everywhere and nothing can refer to something that doesn't exist.
    department = models.ForeignKey(
        'academics.Department', null=True, blank=True,
        on_delete=models.PROTECT, related_name='students',
    )
    course = models.ForeignKey(  # the academic program, e.g. B.Tech Computer Science
        'academics.Course', null=True, blank=True,
        on_delete=models.PROTECT, related_name='students',
    )
    year_of_study = models.PositiveSmallIntegerField(null=True, blank=True)  # 1st year, 2nd year...
    semester = models.ForeignKey(  # the semester record the student is currently in
        'academics.Semester', null=True, blank=True,
        on_delete=models.PROTECT, related_name='students',
    )
    section = models.ForeignKey(
        'academics.Section', null=True, blank=True,
        on_delete=models.PROTECT, related_name='students',
    )
    admission_date = models.DateField(null=True, blank=True)

    # Archiving
    record_status = models.CharField(
        max_length=10,
        choices=RecordStatus.choices,
        default=RecordStatus.ACTIVE,
    )
    archived_at = models.DateTimeField(null=True, blank=True)
    archive_reason = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='students_registered',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['department', 'course', 'year_of_study']),
        ]

    def __str__(self):
        return f'{self.enrollment_number} - {self.user.get_full_name() or self.user.username}'
