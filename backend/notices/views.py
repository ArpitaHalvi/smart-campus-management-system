from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Q

from accounts.models import User
from .models import Notice, NoticeAudience
from .serializers import (
    NoticeSerializer,
    NoticeDetailSerializer,
    NoticeListSerializer,
    NoticeCreateSerializer,
)
from .permissions import (
    IsNoticeCreatorOrAdmin,
    CanCreateNotice,
    CanViewNotice,
)


class NoticeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Notice management.
    
    Admin and Faculty can create, edit, delete notices.
    Students can view notices targeted to them.
    """

    serializer_class = NoticeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description', 'content']
    ordering_fields = ['is_pinned', 'published_at', 'created_at']
    ordering = ['-is_pinned', '-published_at', '-created_at']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        """Filter notices based on user role and audience."""
        user = self.request.user
        
        if user.role == User.Role.ADMIN:
            # Admin sees all notices
            return Notice.objects.select_related('created_by').prefetch_related('audiences')
        
        elif user.role == User.Role.FACULTY:
            # Faculty sees their own notices and all published ones targeted to them
            return Notice.objects.filter(
                Q(created_by=user) |
                (
                    Q(is_published=True) &
                    Q(is_archived=False) &
                    (
                        Q(expires_at__isnull=True) |
                        Q(expires_at__gt=timezone.now())
                    )
                )
            ).select_related('created_by').prefetch_related('audiences').distinct()
        
        elif user.role == User.Role.STUDENT:
            # Students see only published notices targeted to them
            if not hasattr(user, 'student_profile'):
                return Notice.objects.none()
            
            return Notice.objects.filter(
                is_published=True,
                is_archived=False
            ).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            ).select_related('created_by').prefetch_related('audiences').distinct()
        
        return Notice.objects.none()

    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'retrieve':
            return NoticeDetailSerializer
        elif self.action == 'list':
            return NoticeListSerializer
        elif self.action == 'create':
            return NoticeCreateSerializer
        return NoticeSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action == 'create':
            permission_classes = [CanCreateNotice]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsNoticeCreatorOrAdmin]
        elif self.action == 'retrieve':
            permission_classes = [CanViewNotice]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Set created_by to current user."""
        if self.request.user.role not in [User.Role.ADMIN, User.Role.FACULTY]:
            raise PermissionError('Only admin and faculty can create notices.')
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        """Only creator or admin can update."""
        notice = self.get_object()
        if notice.created_by != self.request.user and self.request.user.role != User.Role.ADMIN:
            raise PermissionError('Only the creator can update this notice.')
        serializer.save()

    def perform_destroy(self, instance):
        """Only creator or admin can delete (soft delete)."""
        if instance.created_by != self.request.user and self.request.user.role != User.Role.ADMIN:
            raise PermissionError('Only the creator can delete this notice.')
        instance.is_archived = True
        instance.save()

    @action(detail=True, methods=['post'], permission_classes=[IsNoticeCreatorOrAdmin])
    def publish(self, request, pk=None):
        """Publish a notice (make visible to audience)."""
        notice = self.get_object()
        notice.publish()
        
        return Response(
            {'detail': 'Notice published successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsNoticeCreatorOrAdmin])
    def unpublish(self, request, pk=None):
        """Unpublish a notice (hide from audience)."""
        notice = self.get_object()
        notice.is_published = False
        notice.save()
        
        return Response(
            {'detail': 'Notice unpublished successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsNoticeCreatorOrAdmin])
    def pin(self, request, pk=None):
        """Pin a notice to the top."""
        notice = self.get_object()
        notice.is_pinned = True
        notice.save()
        
        return Response(
            {'detail': 'Notice pinned successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsNoticeCreatorOrAdmin])
    def unpin(self, request, pk=None):
        """Unpin a notice."""
        notice = self.get_object()
        notice.is_pinned = False
        notice.save()
        
        return Response(
            {'detail': 'Notice unpinned successfully.'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def active(self, request):
        """Get all active notices for current user."""
        queryset = self.get_queryset()
        
        # Filter by category if provided
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Apply search if provided
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(content__icontains=search)
            )
        
        serializer = NoticeListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def categories(self, request):
        """Get list of available notice categories."""
        categories = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Notice._meta.get_field('category').choices
        ]
        return Response(categories, status=status.HTTP_200_OK)
