from django.db import models


class Subject(models.Model):

    name = models.CharField(max_length=150)

    code = models.CharField(max_length=20, unique=True)

    description = models.TextField(blank=True)

    department = models.ForeignKey(
        'academics.Department',
        on_delete=models.PROTECT,
        related_name='subjects'
    )

    semester = models.ForeignKey(
        'academics.Semester',
        on_delete=models.PROTECT,
        related_name='subjects'
    )

    section = models.ForeignKey(
        'academics.Section',
        on_delete=models.PROTECT,
        related_name='subjects'
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class SubjectAllocation(models.Model):

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='faculty_allocations'
    )

    faculty = models.ForeignKey(
        'faculty.Faculty',
        on_delete=models.PROTECT,
        related_name='subject_allocations'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['subject', 'faculty'],
                name='unique_subject_faculty'
            )
        ]

    def __str__(self):
        return f"{self.subject.code} - {self.faculty.employee_id}"
