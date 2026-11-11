from rest_framework import serializers
from .models import Subject, SubjectAllocation


class SubjectSerializer(serializers.ModelSerializer):

    class Meta:
        model = Subject
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']



class SubjectAllocationSerializer(serializers.ModelSerializer):

    class Meta:
        model = SubjectAllocation
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        subject = data.get('subject', self.instance.subject if self.instance else None)
        faculty = data.get('faculty', self.instance.faculty if self.instance else None)

        if subject and not subject.is_active:
            raise serializers.ValidationError(
                "Cannot assign an inactive subject."
            )

        if faculty and not faculty.is_active:
            raise serializers.ValidationError(
                "Cannot assign an inactive faculty member."
            )

        existing = SubjectAllocation.objects.filter(
            subject=subject,
            faculty=faculty
        )

        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        if existing.exists():
            raise serializers.ValidationError(
                "This faculty member is already assigned to this subject."
            )

        return data