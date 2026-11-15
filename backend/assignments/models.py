from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone


class Assignment(models.Model):
    """
    Assignment created by faculty for a specific section.
    Students in that section can view, download attachments, and submit.
    """

    title = models.CharField(max_length=200)
    description = models.TextField()

    # Academic structure (must exist - from Member 1)
    semester = models.ForeignKey(
        'academics.Semester',
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    section = models.ForeignKey(
        'academics.Section',
        on_delete=models.CASCADE,
        related_name='assignments'
    )

    # Subject - will be linked after Member 2 implements Subject model
    # Stored as CharField for now (Member 2 not implemented yet)
    # TODO: After Member 2 provides Subject model, convert to FK and run migration
    subject_name = models.CharField(
        max_length=200,
        blank=True,
        help_text='Subject name (will link to Subject model after Member 2 implementation)'
    )

    # Faculty information
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'FACULTY'},
        related_name='assignments_created'
    )

    # Assignment details
    deadline = models.DateTimeField()
    max_marks = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    attachment = models.FileField(
        upload_to='assignments/documents/',
        blank=True,
        null=True,
        help_text='PDF, DOC, DOCX files only'
    )

    # Status management
    is_published = models.BooleanField(
        default=False,
        help_text='Only published assignments are visible to students'
    )
    is_archived = models.BooleanField(
        default=False,
        help_text='Archived assignments are hidden from listing'
    )
    allow_resubmission = models.BooleanField(
        default=False,
        help_text='Allow students to resubmit after initial submission'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-deadline']
        indexes = [
            models.Index(fields=['semester', 'section', 'is_published']),
            models.Index(fields=['created_by', 'created_at']),
        ]

    def __str__(self):
        return f'{self.title} - {self.section.name}'

    @property
    def is_open(self):
        """Check if assignment is still open for submissions."""
        return self.is_published and timezone.now() < self.deadline

    @property
    def is_past_deadline(self):
        """Check if deadline has passed."""
        return timezone.now() > self.deadline


class AssignmentSubmission(models.Model):
    """
    Student submission for an assignment.
    Tracks submission status, marks, and feedback.
    """

    STATUS_CHOICES = (
        ('pending', 'Not Submitted'),
        ('submitted', 'Submitted On Time'),
        ('late', 'Submitted Late'),
        ('evaluated', 'Evaluated'),
    )

    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='assignment_submissions'
    )

    # Submission file
    submission_file = models.FileField(
        upload_to='submissions/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text='PDF, DOC, DOCX files only. Max 10MB'
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the submission was first made'
    )

    # Submission status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='Auto-calculated: pending/submitted/late/evaluated'
    )

    # Evaluation
    marks_obtained = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    feedback = models.TextField(
        blank=True,
        help_text='Faculty feedback on the submission'
    )
    feedback_visible = models.BooleanField(
        default=False,
        help_text='Is feedback visible to student?'
    )

    # Resubmission tracking
    revised_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When resubmission was made (if allowed)'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('assignment', 'student')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['assignment', 'status']),
            models.Index(fields=['student', 'status']),
        ]

    def __str__(self):
        return f'{self.student.user.username} - {self.assignment.title}'

    def save(self, *args, **kwargs):
        """Auto-calculate status based on submission time and deadline."""
        if self.submitted_at:
            if self.submitted_at > self.assignment.deadline:
                self.status = 'late'
            elif self.status == 'pending':
                self.status = 'submitted'
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Check if this submission is past deadline without submission."""
        return (
            self.status == 'pending' and
            timezone.now() > self.assignment.deadline
        )

    @property
    def days_late(self):
        """Calculate how many days late the submission is."""
        if self.status == 'late' and self.submitted_at:
            delta = self.submitted_at - self.assignment.deadline
            return max(1, delta.days)
        return 0
