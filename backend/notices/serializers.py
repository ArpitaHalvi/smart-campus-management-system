from rest_framework import serializers
from django.utils import timezone

from .models import Notice, NoticeAudience


class NoticeAudienceSerializer(serializers.ModelSerializer):
    """Serializer for NoticeAudience."""

    audience_label = serializers.SerializerMethodField()
    department_name = serializers.CharField(
        source='department.name',
        read_only=True
    )
    semester_label = serializers.CharField(
        source='semester.__str__',
        read_only=True
    )
    section_name = serializers.CharField(
        source='section.name',
        read_only=True
    )
    user_name = serializers.CharField(
        source='user.get_full_name',
        read_only=True
    )

    class Meta:
        model = NoticeAudience
        fields = [
            'id', 'audience_type', 'audience_label', 'department',
            'department_name', 'semester', 'semester_label', 'section',
            'section_name', 'user', 'user_name', 'created_at'
        ]
        read_only_fields = [
            'id', 'audience_label', 'department_name', 'semester_label',
            'section_name', 'user_name', 'created_at'
        ]

    def get_audience_label(self, obj):
        """Get human-readable audience label."""
        return str(obj)


class NoticeSerializer(serializers.ModelSerializer):
    """Serializer for Notice listing and creation."""

    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    audiences = NoticeAudienceSerializer(many=True, read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Notice
        fields = [
            'id', 'title', 'description', 'category', 'content',
            'attachment', 'is_published', 'published_at', 'is_pinned',
            'expires_at', 'is_archived', 'created_by', 'created_by_name',
            'audiences', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'published_at',
            'audiences', 'is_active', 'created_at', 'updated_at'
        ]

    def validate(self, attrs):
        """Cross-field validation."""
        # Check expiry date
        expires_at = attrs.get('expires_at')
        if expires_at and expires_at <= timezone.now():
            raise serializers.ValidationError({
                'expires_at': 'Expiry date must be in the future.'
            })
        
        return attrs


class NoticeDetailSerializer(NoticeSerializer):
    """Extended serializer for notice detail view."""

    class Meta(NoticeSerializer.Meta):
        pass


class NoticeListSerializer(serializers.ModelSerializer):
    """Simplified serializer for notice listing."""

    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )

    class Meta:
        model = Notice
        fields = [
            'id', 'title', 'content', 'category', 'category_display', 'is_pinned',
            'is_published', 'published_at', 'expires_at', 'created_by_name', 'is_active', 'created_at'
        ]
        read_only_fields = fields


class NoticeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notices with audience targeting."""

    audience_data = serializers.ListField(
        child=serializers.JSONField(),
        write_only=True,
        required=False,
        help_text='List of audience objects: [{"audience_type": "ALL"}, {"audience_type": "DEPARTMENT", "department": 1}, ...]'
    )

    class Meta:
        model = Notice
        fields = [
            'id', 'title', 'description', 'category', 'content',
            'attachment', 'is_published', 'is_pinned', 'expires_at',
            'audience_data'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        """Create notice with audiences."""
        import json
        audience_data = validated_data.pop('audience_data', [])
        
        # Parse audience_data if it's a JSON string
        if isinstance(audience_data, str):
            try:
                audience_data = json.loads(audience_data)
            except json.JSONDecodeError:
                audience_data = []
        
        notice = Notice.objects.create(
            created_by=self.context['request'].user,
            **validated_data
        )
        
        # Create audience entries
        for audience_item in audience_data:
            if isinstance(audience_item, dict):
                audience_type = audience_item.get('audience_type')
                
                audience_obj = NoticeAudience.objects.create(
                    notice=notice,
                    audience_type=audience_type,
                    department_id=audience_item.get('department'),
                    semester_id=audience_item.get('semester'),
                    section_id=audience_item.get('section'),
                    user_id=audience_item.get('user')
                )
        
        return notice

    def validate(self, attrs):
        """Validate audience data."""
        import json
        audience_data = attrs.get('audience_data', [])
        
        # Parse audience_data if it's a JSON string
        if isinstance(audience_data, str):
            try:
                audience_data = json.loads(audience_data)
            except json.JSONDecodeError:
                raise serializers.ValidationError({
                    'audience_data': 'Invalid JSON format for audience_data.'
                })
        
        if not audience_data or (isinstance(audience_data, list) and len(audience_data) == 0):
            raise serializers.ValidationError({
                'audience_data': 'At least one audience must be specified.'
            })
        
        return attrs
