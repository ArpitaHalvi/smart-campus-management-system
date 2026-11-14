
from django.db import models


class Timetable(models.Model):

    class Day(models.TextChoices):
        MONDAY = 'MONDAY', 'Monday'
        TUESDAY = 'TUESDAY', 'Tuesday'
        WEDNESDAY = 'WEDNESDAY', 'Wednesday'
        THURSDAY = 'THURSDAY', 'Thursday'
        FRIDAY = 'FRIDAY', 'Friday'
        SATURDAY = 'SATURDAY', 'Saturday'

    section = models.ForeignKey(
        'academics.Section',
        on_delete=models.CASCADE,
        related_name='timetable_entries'
    )

    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.PROTECT,
        related_name='timetable_entries'
    )

    faculty = models.ForeignKey(
        'faculty.Faculty',
        on_delete=models.PROTECT,
        related_name='timetable_entries'
    )

    day = models.CharField(
        max_length=10,
        choices=Day.choices
    )

    start_time = models.TimeField()
    end_time = models.TimeField()

    room = models.CharField(max_length=50)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['day', 'start_time']

    def __str__(self):
        return f"{self.subject.code} - {self.section} - {self.day}"
