from django.conf import settings
from django.db import models


class AttendanceSession(models.Model):

    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.PROTECT,
        related_name='attendance_sessions'
    )

    section = models.ForeignKey(
        'academics.Section',
        on_delete=models.PROTECT,
        related_name='attendance_sessions'
    )

    faculty = models.ForeignKey(
        'faculty.Faculty',
        on_delete=models.PROTECT,
        related_name='attendance_sessions'
    )

    attendance_date = models.DateField()

    session_number = models.PositiveSmallIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-attendance_date']
        constraints = [
            models.UniqueConstraint(
                fields=[
                    'subject',
                    'section',
                    'attendance_date',
                    'session_number'
                ],
                name='unique_attendance_session'
            )
        ]

    def __str__(self):
        return f"{self.subject.code} - {self.attendance_date}"


class AttendanceRecord(models.Model):

    class Status(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'
        LATE = 'LATE', 'Late'

    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name='records'
    )

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.PROTECT,
        related_name='attendance_records'
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ABSENT
    )

    remarks = models.CharField(max_length=255, blank=True)

    marked_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['student__enrollment_number']
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'student'],
                name='unique_student_attendance'
            )
        ]

    def __str__(self):
        return f"{self.student.enrollment_number} - {self.status}"


class AttendanceCorrection(models.Model):

    attendance_record = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name='corrections'
    )

    previous_status = models.CharField(max_length=10)

    new_status = models.CharField(max_length=10)

    reason = models.CharField(max_length=255)

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='attendance_corrections'
    )

    corrected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-corrected_at']

    def __str__(self):
        return f"Correction for attendance record {self.attendance_record_id}"
