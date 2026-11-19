from rest_framework import serializers
from django.utils import timezone

from .models import Event, EventRegistration


class EventSerializer(serializers.ModelSerializer):
    """Serializer for Event listing and creation."""

    organizer_name = serializers.CharField(
        source='organizer.get_full_name',
        read_only=True
    )
    department_name = serializers.CharField(
        source='organizing_department.name',
        read_only=True,
        allow_null=True
    )
    is_registration_open = serializers.BooleanField(read_only=True)
    can_register = serializers.BooleanField(read_only=True)
    availability_slots = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'start_datetime', 'end_datetime',
            'venue', 'organizer', 'organizer_name', 'organizing_department',
            'department_name', 'poster_image', 'registration_deadline',
            'max_participants', 'current_participants', 'status', 'is_published',
            'is_registration_open', 'can_register', 'availability_slots',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'organizer', 'organizer_name', 'department_name', 'status',
            'current_participants', 'is_registration_open', 'can_register',
            'availability_slots', 'created_at', 'updated_at'
        ]

    def validate(self, attrs):
        """Cross-field validation."""
        start = attrs.get('start_datetime')
        end = attrs.get('end_datetime')
        registration_deadline = attrs.get('registration_deadline')
        
        if start and end:
            if end <= start:
                raise serializers.ValidationError({
                    'end_datetime': 'End datetime must be after start datetime.'
                })
        
        if start and registration_deadline:
            if registration_deadline >= start:
                raise serializers.ValidationError({
                    'registration_deadline': 'Registration deadline must be before event start.'
                })
        
        return attrs


class EventDetailSerializer(EventSerializer):
    """Extended serializer for event detail view."""

    registration_count = serializers.SerializerMethodField()

    class Meta(EventSerializer.Meta):
        fields = EventSerializer.Meta.fields + ['registration_count']

    def get_registration_count(self, obj):
        """Get count of registered participants."""
        return obj.registrations.filter(status='REGISTERED').count()


class EventListSerializer(serializers.ModelSerializer):
    """Simplified serializer for event listing."""

    organizer_name = serializers.CharField(
        source='organizer.get_full_name',
        read_only=True
    )
    is_registration_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'start_datetime', 'end_datetime', 'venue',
            'organizer_name', 'max_participants', 'current_participants',
            'status', 'is_registration_open'
        ]
        read_only_fields = fields


class EventRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for event registrations."""

    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True
    )
    enrollment_number = serializers.CharField(
        source='student.enrollment_number',
        read_only=True
    )
    event_title = serializers.CharField(
        source='event.title',
        read_only=True
    )

    class Meta:
        model = EventRegistration
        fields = [
            'id', 'event', 'event_title', 'student', 'student_name',
            'enrollment_number', 'registered_at', 'status', 'is_attended',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'registered_at', 'event_title', 'student_name',
            'enrollment_number', 'created_at', 'updated_at'
        ]


class StudentEventRegistrationSerializer(serializers.ModelSerializer):
    """Simplified serializer for students viewing their registrations."""

    event_title = serializers.CharField(
        source='event.title',
        read_only=True
    )
    start_datetime = serializers.DateTimeField(
        source='event.start_datetime',
        read_only=True
    )
    end_datetime = serializers.DateTimeField(
        source='event.end_datetime',
        read_only=True
    )
    venue = serializers.CharField(
        source='event.venue',
        read_only=True
    )

    class Meta:
        model = EventRegistration
        fields = [
            'id', 'event', 'event_title', 'start_datetime', 'end_datetime',
            'venue', 'registered_at', 'status', 'is_attended'
        ]
        read_only_fields = fields


class EventRegistrationListSerializer(serializers.ModelSerializer):
    """Serializer for organizers viewing registrations."""

    student_name = serializers.CharField(
        source='student.user.get_full_name',
        read_only=True
    )
    enrollment_number = serializers.CharField(
        source='student.enrollment_number',
        read_only=True
    )

    class Meta:
        model = EventRegistration
        fields = [
            'id', 'student', 'student_name', 'enrollment_number',
            'registered_at', 'status', 'is_attended'
        ]
        read_only_fields = fields


class EventCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating events."""

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'start_datetime', 'end_datetime',
            'venue', 'organizing_department', 'poster_image',
            'registration_deadline', 'max_participants'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        """Create event with organizer set from request context."""
        event = Event.objects.create(
            organizer=self.context['request'].user,
            **validated_data
        )
        return event

    def validate_start_datetime(self, value):
        """Ensure start_datetime is in future."""
        if value <= timezone.now():
            raise serializers.ValidationError(
                'Event start datetime must be in the future.'
            )
        return value

    def validate_registration_deadline(self, value):
        """Ensure registration deadline is in future."""
        if value <= timezone.now():
            raise serializers.ValidationError(
                'Registration deadline must be in the future.'
            )
        return value

    def validate_max_participants(self, value):
        """Ensure max_participants is positive if set."""
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                'Maximum participants must be greater than 0.'
            )
        return value
