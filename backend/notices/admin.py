from django.contrib import admin
from .models import Notice, NoticeAudience


class NoticeAudienceInline(admin.TabularInline):
    model = NoticeAudience
    extra = 1
    fields = ('audience_type', 'department', 'semester', 'section', 'user')


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'category',
        'is_published',
        'is_pinned',
        'is_archived',
        'created_by',
        'published_at',
        'expires_at'
    )
    list_filter = (
        'is_published',
        'is_pinned',
        'is_archived',
        'category',
        'published_at',
        'expires_at',
        'created_at'
    )
    search_fields = ('title', 'description', 'content')
    readonly_fields = ('created_at', 'updated_at', 'published_at')
    inlines = [NoticeAudienceInline]

    fieldsets = (
        ('Notice Information', {
            'fields': ('title', 'description', 'category', 'content')
        }),
        ('Attachment', {
            'fields': ('attachment',)
        }),
        ('Publishing', {
            'fields': ('is_published', 'published_at', 'is_pinned', 'expires_at')
        }),
        ('Management', {
            'fields': ('created_by', 'is_archived')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new notice
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(NoticeAudience)
class NoticeAudienceAdmin(admin.ModelAdmin):
    list_display = ('notice', 'audience_type', 'department', 'semester', 'section', 'user')
    list_filter = ('audience_type', 'created_at')
    search_fields = ('notice__title', 'user__username')
    readonly_fields = ('created_at',)
