from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone


class Event(models.Model):
    """
    Campus event like seminars, workshops, competitions, etc.
    Students can register and organizers can track participation.
    """

    STATUS_CHOICES = (
        ('UPCOMING', 'Upcoming'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    title = models.CharField(max_length=200)
    description = models.TextField()

    # Event timing
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()

    # Venue
    venue = models.CharField(
        max_length=300,
        help_text='Location of the event'
    )

    # Organization
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role__in': ['ADMIN', 'FACULTY']},
        related_name='events_organized'
    )
    organizing_department = models.ForeignKey(
        'academics.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events_organized'
    )

    # Visual
    poster_image = models.ImageField(
        upload_to='events/posters/%Y/%m/',
        blank=True,
        null=True,
        help_text='Event poster or image (JPG/PNG)'
    )

    # Registration
    registration_deadline = models.DateTimeField(
        help_text='Last date for student registration'
    )
    max_participants = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Maximum participants allowed (null = unlimited)'
    )
    current_participants = models.PositiveIntegerField(
        default=0,
        editable=False,
        help_text='Current registered participants count'
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='UPCOMING',
        help_text='Auto-calculated based on datetime'
    )

    # Publishing
    is_published = models.BooleanField(
        default=False,
        help_text='Published events are visible to students'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_datetime']
        indexes = [
            models.Index(fields=['status', 'is_published']),
            models.Index(fields=['start_datetime', 'end_datetime']),
            models.Index(fields=['organizer', 'created_at']),
        ]

    def __str__(self):
        return f'{self.title} - {self.start_datetime.date()}'

    def save(self, *args, **kwargs):
        """Auto-calculate status based on current time."""
        now = timezone.now()
        if now < self.start_datetime:
            self.status = 'UPCOMING'
        elif now < self.end_datetime:
            self.status = 'ONGOING'
        elif self.status != 'CANCELLED':
            self.status = 'COMPLETED'
        super().save(*args, **kwargs)

    @property
    def is_registration_open(self):
        """Check if registration is still open."""
        return (
            self.is_published and
            timezone.now() < self.registration_deadline and
            self.status != 'CANCELLED'
        )

    @property
    def can_register(self):
        """Check if new registrations are allowed."""
        if not self.is_registration_open:
            return False
        if self.max_participants and self.current_participants >= self.max_participants:
            return False
        return True

    @property
    def availability_slots(self):
        """Get remaining registration slots."""
        if not self.max_participants:
            return None  # unlimited
        return max(0, self.max_participants - self.current_participants)

    def update_participant_count(self):
        """Sync current_participants with actual registrations."""
        count = self.registrations.filter(status='REGISTERED').count()
        self.current_participants = count
        self.save()


class EventRegistration(models.Model):
    """
    Student registration for an event.
    Tracks registration status and attendance.
    """

    REGISTRATION_STATUS_CHOICES = (
        ('REGISTERED', 'Registered'),
        ('CANCELLED', 'Cancelled'),
        ('ATTENDED', 'Attended'),
    )

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='registrations'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='event_registrations'
    )

    # Registration status
    registered_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=REGISTRATION_STATUS_CHOICES,
        default='REGISTERED'
    )

    # Attendance tracking
    is_attended = models.BooleanField(
        default=False,
        help_text='Mark as attended after event'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('event', 'student')
        ordering = ['-registered_at']
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['student', 'status']),
        ]

    def __str__(self):
        return f'{self.student.user.username} - {self.event.title}'

    def save(self, *args, **kwargs):
        """Track participant count on registration changes."""
        super().save(*args, **kwargs)
        self.event.update_participant_count()

    def delete(self, *args, **kwargs):
        """Update participant count when registration is deleted."""
        event = self.event
        super().delete(*args, **kwargs)
        event.update_participant_count()

    @property
    def can_cancel(self):
        """Check if registration can be cancelled."""
        # Allow cancellation if event not started and status is REGISTERED
        if self.status != 'REGISTERED':
            return False
        if timezone.now() >= self.event.start_datetime:
            return False
        return True

    def mark_attended(self):
        """Mark student as attended the event."""
        if self.event.status in ['ONGOING', 'COMPLETED']:
            self.status = 'ATTENDED'
            self.is_attended = True
            self.save()
