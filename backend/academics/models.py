from django.conf import settings
from django.db import models
from django.db.models.functions import Lower


class Department(models.Model):
    """
    An academic department. Students point at it by id (student.department_id),
    so renaming it is reflected everywhere. Name and code are unique ignoring case.
    """

    name = models.CharField(max_length=120)
    code = models.CharField(max_length=10, blank=True)  # e.g. CSE
    description = models.TextField(blank=True)
    head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='headed_departments',
        limit_choices_to={'role': 'FACULTY'},
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(Lower('name'), name='department_name_unique_ci'),
            models.UniqueConstraint(
                Lower('code'),
                condition=~models.Q(code=''),
                name='department_code_unique_ci',
            ),
        ]

    def __str__(self):
        return self.name


class AcademicYear(models.Model):
    """A teaching year such as 2026-27. Exactly one can be the current year."""

    name = models.CharField(max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']
        constraints = [
            models.UniqueConstraint(Lower('name'), name='academic_year_name_unique_ci'),
            # The database itself refuses a second current year
            models.UniqueConstraint(
                fields=['is_current'],
                condition=models.Q(is_current=True),
                name='only_one_current_academic_year',
            ),
        ]

    def __str__(self):
        return self.name


class Semester(models.Model):
    """
    One semester within an academic year. Odd semesters (1, 3, 5, 7) normally
    run side by side, so semesters of a year may overlap each other, but each
    must fall inside its academic year.
    """

    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.PROTECT, related_name='semesters'
    )
    number = models.PositiveSmallIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year__start_date', 'number']
        constraints = [
            models.UniqueConstraint(
                fields=['academic_year', 'number'], name='semester_unique_per_year'
            ),
        ]

    @property
    def name(self):
        return f'Semester {self.number}'

    def __str__(self):
        return f'{self.name} ({self.academic_year})'


class Course(models.Model):
    """An academic program, e.g. B.Tech Computer Science. Students point at it by id (student.course_id)."""

    name = models.CharField(max_length=120)
    code = models.CharField(max_length=10, blank=True)
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.PROTECT, related_name='courses'
    )
    duration_years = models.PositiveSmallIntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(Lower('name'), name='course_name_unique_ci'),
            models.UniqueConstraint(
                Lower('code'),
                condition=~models.Q(code=''),
                name='course_code_unique_ci',
            ),
        ]

    def __str__(self):
        return self.name


class Section(models.Model):
    """A class group (A, B, ...) of a course, optionally tied to one semester."""

    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='sections')
    semester = models.ForeignKey(
        Semester, null=True, blank=True, on_delete=models.PROTECT, related_name='sections'
    )
    name = models.CharField(max_length=10)
    capacity = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['course__name', 'semester__number', 'name']
        constraints = [
            models.UniqueConstraint(
                Lower('name'), 'course', 'semester',
                condition=models.Q(semester__isnull=False),
                name='section_unique_in_semester',
            ),
            models.UniqueConstraint(
                Lower('name'), 'course',
                condition=models.Q(semester__isnull=True),
                name='section_unique_in_course',
            ),
        ]

    def __str__(self):
        return f'{self.course} {self.name}'
