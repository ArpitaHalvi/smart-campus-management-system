from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from accounts.models import User
from .models import Event, EventRegistration
from .serializers import (
    EventSerializer,
    EventDetailSerializer,
    EventListSerializer,
    EventCreateSerializer,
    EventRegistrationSerializer,
    StudentEventRegistrationSerializer,
    EventRegistrationListSerializer,
)
from .permissions import (
    IsEventOrganizerOrAdmin,
    CanCreateEvent,
    CanRegisterEvent,
    CanViewEventRegistrations,
)


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Event management.
    
    Admin and Faculty can create, edit, delete events.
    Students can view published events and register for them.
    """

    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description', 'venue']
    ordering_fields = ['start_datetime', 'created_at']
    ordering = ['start_datetime']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        """Filter events based on user role."""
        user = self.request.user
        
        if user.role == User.Role.ADMIN:
            # Admin sees all events
            return Event.objects.select_related(
                'organizer', 'organizing_department'
            ).prefetch_related('registrations')
        
        elif user.role == User.Role.FACULTY:
            # Faculty sees their own events and published events
            return Event.objects.filter(
                Q(organizer=user) |
                Q(is_published=True)
            ).select_related(
                'organizer', 'organizing_department'
            ).prefetch_related('registrations').distinct()
        
        elif user.role == User.Role.STUDENT:
            # Students see only published events
            return Event.objects.filter(
                is_published=True
            ).select_related(
                'organizer', 'organizing_department'
            ).prefetch_related('registrations')
        
        return Event.objects.none()

    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'retrieve':
            return EventDetailSerializer
        elif self.action == 'list':
            return EventListSerializer
        elif self.action == 'create':
            return EventCreateSerializer
        return EventSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action == 'create':
            permission_classes = [CanCreateEvent]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsEventOrganizerOrAdmin]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Set organizer to current user."""
        if self.request.user.role not in [User.Role.ADMIN, User.Role.FACULTY]:
            raise PermissionError('Only admin and faculty can create events.')
        serializer.save(organizer=self.request.user)

    def perform_update(self, serializer):
        """Only organizer or admin can update."""
        event = self.get_object()
        if event.organizer != self.request.user and self.request.user.role != User.Role.ADMIN:
            raise PermissionError('Only the organizer can update this event.')
        serializer.save()

    def perform_destroy(self, instance):
        """Only organizer or admin can delete."""
        if instance.organizer != self.request.user and self.request.user.role != User.Role.ADMIN:
            raise PermissionError('Only the organizer can delete this event.')
        instance.status = 'CANCELLED'
        instance.save()

    @action(detail=True, methods=['post'], permission_classes=[IsEventOrganizerOrAdmin])
    def publish(self, request, pk=None):
        """Publish an event (make visible to students)."""
        event = self.get_object()
        event.is_published = True
        event.save()
        
        return Response(
            {'detail': 'Event published successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsEventOrganizerOrAdmin])
    def unpublish(self, request, pk=None):
        """Unpublish an event (hide from students)."""
        event = self.get_object()
        event.is_published = False
        event.save()
        
        return Response(
            {'detail': 'Event unpublished successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def upcoming(self, request):
        """Get upcoming events."""
        now = timezone.now()
        queryset = self.get_queryset().filter(
            start_datetime__gt=now,
            status='UPCOMING'
        )
        
        serializer = EventListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def past(self, request):
        """Get past events."""
        now = timezone.now()
        queryset = self.get_queryset().filter(
            end_datetime__lt=now
        )
        
        serializer = EventListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsEventOrganizerOrAdmin])
    def registrations(self, request, pk=None):
        """Get all registrations for an event (organizer only)."""
        event = self.get_object()
        
        if event.organizer != request.user and request.user.role != User.Role.ADMIN:
            return Response(
                {'detail': 'You do not have permission to view registrations.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        registrations = event.registrations.select_related('student__user').order_by('-registered_at')
        
        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            registrations = registrations.filter(status=status_filter)
        
        serializer = EventRegistrationListSerializer(registrations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def registration_stats(self, request, pk=None):
        """Get registration statistics for an event."""
        event = self.get_object()
        
        stats = {
            'total_registered': event.registrations.filter(status='REGISTERED').count(),
            'total_attended': event.registrations.filter(status='ATTENDED').count(),
            'total_cancelled': event.registrations.filter(status='CANCELLED').count(),
            'max_capacity': event.max_participants,
            'availability': event.availability_slots,
        }
        
        return Response(stats, status=status.HTTP_200_OK)


class EventRegistrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling event registrations.
    
    Students can register, view, and cancel their registrations.
    Organizers and admin can view all registrations.
    """

    serializer_class = EventRegistrationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        """Filter registrations based on user role."""
        user = self.request.user
        
        if user.role == User.Role.ADMIN:
            return EventRegistration.objects.select_related('event', 'student__user')
        
        elif user.role == User.Role.FACULTY:
            # Faculty sees registrations for their events
            return EventRegistration.objects.filter(
                event__organizer=user
            ).select_related('event', 'student__user')
        
        elif user.role == User.Role.STUDENT:
            # Students see only their own registrations
            if not hasattr(user, 'student_profile'):
                return EventRegistration.objects.none()
            return EventRegistration.objects.filter(
                student__user=user
            ).select_related('event', 'student__user')
        
        return EventRegistration.objects.none()

    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.request.user.role == User.Role.STUDENT:
            return StudentEventRegistrationSerializer
        elif self.action == 'list':
            return EventRegistrationListSerializer
        return EventRegistrationSerializer

    def create(self, request, *args, **kwargs):
        """Handle student registration for event."""
        if request.user.role != User.Role.STUDENT:
            return Response(
                {'detail': 'Only students can register for events.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'detail': 'Student profile not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event_id = request.data.get('event')
        if not event_id:
            return Response(
                {'detail': 'event ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event = get_object_or_404(Event, id=event_id)
        student = request.user.student_profile
        
        # Check if event is published
        if not event.is_published:
            return Response(
                {'detail': 'This event is not published yet.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if registration is open
        if not event.is_registration_open:
            return Response(
                {'detail': 'Registration is not open for this event.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if can register
        if not event.can_register:
            return Response(
                {'detail': 'Event is at full capacity or registration is closed.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check for duplicate registration
        existing = EventRegistration.objects.filter(
            event=event,
            student=student
        ).first()
        
        if existing:
            if existing.status == 'CANCELLED':
                # Allow re-registration after cancellation
                existing.status = 'REGISTERED'
                existing.registered_at = timezone.now()
                existing.save()
                event.update_participant_count()
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'detail': 'You are already registered for this event.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create new registration
        registration = EventRegistration.objects.create(
            event=event,
            student=student,
            status='REGISTERED'
        )
        
        serializer = self.get_serializer(registration)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        """Cancel event registration."""
        registration = self.get_object()
        
        if request.user.role == User.Role.STUDENT:
            if registration.student.user != request.user:
                return Response(
                    {'detail': 'You can only cancel your own registrations.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.role != User.Role.ADMIN:
            return Response(
                {'detail': 'You do not have permission to cancel this registration.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if can cancel
        if not registration.can_cancel:
            return Response(
                {'detail': 'Cannot cancel registration. Event may have started.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        registration.status = 'CANCELLED'
        registration.save()
        registration.event.update_participant_count()
        
        return Response(
            {'detail': 'Registration cancelled successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_registrations(self, request):
        """Get current student's event registrations."""
        if request.user.role != User.Role.STUDENT:
            return Response(
                {'detail': 'Only students can view their registrations.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not hasattr(request.user, 'student_profile'):
            return Response([], status=status.HTTP_200_OK)
        
        registrations = self.get_queryset()
        serializer = StudentEventRegistrationSerializer(registrations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
