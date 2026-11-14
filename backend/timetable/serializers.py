
from rest_framework import serializers
from .models import Timetable


class TimetableSerializer(serializers.ModelSerializer):

    class Meta:
        model = Timetable
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def validate(self, data):

        # Get values from the request or existing record during updates
        section = data.get('section', self.instance.section if self.instance else None)
        subject = data.get('subject', self.instance.subject if self.instance else None)
        faculty = data.get('faculty', self.instance.faculty if self.instance else None)
        day = data.get('day', self.instance.day if self.instance else None)
        start_time = data.get('start_time', self.instance.start_time if self.instance else None)
        end_time = data.get('end_time', self.instance.end_time if self.instance else None)
        room = data.get('room', self.instance.room if self.instance else None)

        # Check class timing
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                "End time must be later than start time."
            )

        # Check whether the subject belongs to the selected section
        if subject and section and subject.section_id != section.id:
            raise serializers.ValidationError(
                "This subject does not belong to the selected section."
            )

        # Check whether subject and faculty are active
        if subject and not subject.is_active:
            raise serializers.ValidationError(
                "This subject is inactive."
            )

        if faculty and not faculty.is_active:
            raise serializers.ValidationError(
                "This faculty member is inactive."
            )

        # Check whether faculty is allocated to the subject
        if subject and faculty:
            from subjects.models import SubjectAllocation

            allocation_exists = SubjectAllocation.objects.filter(
                subject=subject,
                faculty=faculty
            ).exists()

            if not allocation_exists:
                raise serializers.ValidationError(
                    "This faculty member is not allocated to this subject."
                )

        # Check for overlapping classes
        if day and start_time and end_time:
            conflicts = Timetable.objects.filter(day=day)

            # Exclude the current entry when updating
            if self.instance:
                conflicts = conflicts.exclude(pk=self.instance.pk)

            overlapping = conflicts.filter(
                start_time__lt=end_time,
                end_time__gt=start_time
            )

            if section and overlapping.filter(section=section).exists():
                raise serializers.ValidationError(
                    "This section already has a class at this time."
                )

            if faculty and overlapping.filter(faculty=faculty).exists():
                raise serializers.ValidationError(
                    "This faculty member already has a class at this time."
                )

            if room and overlapping.filter(room__iexact=room).exists():
                raise serializers.ValidationError(
                    "This classroom is already occupied at this time."
                )

        return data
