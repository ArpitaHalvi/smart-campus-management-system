from django.db import models
from django.conf import settings
from django.utils import timezone


class Notice(models.Model):
    """
    Announcement/Notice for campus-wide or targeted distribution.
    Created by admin or faculty members.
    """

    CATEGORY_CHOICES = (
        ('GENERAL', 'General'),
        ('ACADEMIC', 'Academic'),
        ('EXAMINATION', 'Examination'),
        ('HOLIDAY', 'Holiday'),
        ('EVENTS', 'Events'),
        ('ADMINISTRATIVE', 'Administrative'),
    )

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='GENERAL'
    )
    content = models.TextField()

    # Attachments
    attachment = models.FileField(
        upload_to='notices/%Y/%m/',
        blank=True,
        null=True,
        help_text='Optional supporting document'
    )

    # Publishing
    is_published = models.BooleanField(
        default=False,
        help_text='Published notices are visible to audience'
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When notice was published'
    )
    is_pinned = models.BooleanField(
        default=False,
        help_text='Pinned notices appear at top'
    )

    # Expiry
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Notice automatically hides after this date'
    )

    # Management
    is_archived = models.BooleanField(
        default=False,
        help_text='Archived notices are hidden from listing'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role__in': ['ADMIN', 'FACULTY']},
        related_name='notices_created'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-published_at', '-created_at']
        indexes = [
            models.Index(fields=['is_published', 'is_archived', 'expires_at']),
            models.Index(fields=['created_by', 'created_at']),
        ]

    def __str__(self):
        return f'{self.title} ({self.get_category_display()})'

    @property
    def is_active(self):
        """Check if notice is currently active and visible."""
        if not self.is_published or self.is_archived:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True

    def publish(self):
        """Mark notice as published."""
        if not self.is_published:
            self.is_published = True
            self.published_at = timezone.now()
            self.save()


class NoticeAudience(models.Model):
    """
    Defines who can see a notice.
    Allows targeting by department, semester, section, or individuals.
    """

    AUDIENCE_TYPE_CHOICES = (
        ('ALL', 'All Users'),
        ('DEPARTMENT', 'Department'),
        ('SEMESTER', 'Semester'),
        ('SECTION', 'Section'),
        ('STUDENT', 'Specific Student'),
        ('FACULTY', 'Specific Faculty'),
    )

    notice = models.ForeignKey(
        Notice,
        on_delete=models.CASCADE,
        related_name='audiences'
    )

    audience_type = models.CharField(
        max_length=20,
        choices=AUDIENCE_TYPE_CHOICES
    )

    # Optional: specific department
    department = models.ForeignKey(
        'academics.Department',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notices_targeted'
    )

    # Optional: specific semester
    semester = models.ForeignKey(
        'academics.Semester',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notices_targeted'
    )

    # Optional: specific section
    section = models.ForeignKey(
        'academics.Section',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notices_targeted'
    )

    # Optional: specific user (student or faculty)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notices_targeted'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('notice', 'audience_type', 'department', 'semester', 'section', 'user')
        ordering = ['audience_type']

    def __str__(self):
        if self.audience_type == 'ALL':
            return 'All Users'
        elif self.audience_type == 'DEPARTMENT' and self.department:
            return f'Department: {self.department.name}'
        elif self.audience_type == 'SEMESTER' and self.semester:
            return f'Semester: {self.semester}'
        elif self.audience_type == 'SECTION' and self.section:
            return f'Section: {self.section}'
        elif self.audience_type in ('STUDENT', 'FACULTY') and self.user:
            return f'{self.get_audience_type_display()}: {self.user.username}'
        return self.get_audience_type_display()

    def can_view(self, user):
        """Check if a user can view this notice audience."""
        if self.audience_type == 'ALL':
            return True
        elif self.audience_type == 'DEPARTMENT' and self.department:
            if hasattr(user, 'student_profile') and user.student_profile:
                return user.student_profile.department == self.department
            return False
        elif self.audience_type == 'SEMESTER' and self.semester:
            if hasattr(user, 'student_profile') and user.student_profile:
                return user.student_profile.semester == self.semester
            return False
        elif self.audience_type == 'SECTION' and self.section:
            if hasattr(user, 'student_profile') and user.student_profile:
                return user.student_profile.section == self.section
            return False
        elif self.audience_type in ('STUDENT', 'FACULTY') and self.user:
            return user == self.user
        return False
