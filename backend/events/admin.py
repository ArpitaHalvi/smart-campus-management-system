from django.contrib import admin
from .models import Event, EventRegistration


class EventRegistrationInline(admin.TabularInline):
    model = EventRegistration
    extra = 0
    readonly_fields = ('student', 'registered_at', 'status', 'is_attended')
    can_delete = False
    fields = ('student', 'status', 'is_attended', 'registered_at')


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'start_datetime',
        'end_datetime',
        'status',
        'is_published',
        'current_participants',
        'max_participants',
        'organizer',
        'created_at'
    )
    list_filter = (
        'status',
        'is_published',
        'start_datetime',
        'end_datetime',
        'organizer',
        'created_at'
    )
    search_fields = ('title', 'description', 'venue')
    readonly_fields = ('status', 'current_participants', 'created_at', 'updated_at')
    inlines = [EventRegistrationInline]

    fieldsets = (
        ('Event Information', {
            'fields': ('title', 'description', 'venue')
        }),
        ('Timing', {
            'fields': ('start_datetime', 'end_datetime')
        }),
        ('Organization', {
            'fields': ('organizer', 'organizing_department')
        }),
        ('Registration', {
            'fields': (
                'registration_deadline',
                'max_participants',
                'current_participants'
            )
        }),
        ('Visual', {
            'fields': ('poster_image',)
        }),
        ('Management', {
            'fields': ('is_published', 'status')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new event
            obj.organizer = request.user
        super().save_model(request, obj, form, change)


@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = (
        'get_student_name',
        'get_event_title',
        'status',
        'is_attended',
        'registered_at'
    )
    list_filter = ('status', 'is_attended', 'registered_at', 'event__start_datetime')
    search_fields = (
        'student__user__username',
        'student__enrollment_number',
        'event__title'
    )
    readonly_fields = ('created_at', 'updated_at', 'registered_at')

    fieldsets = (
        ('Registration', {
            'fields': ('event', 'student', 'registered_at')
        }),
        ('Status', {
            'fields': ('status', 'is_attended')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def get_student_name(self, obj):
        return obj.student.user.get_full_name() or obj.student.enrollment_number
    get_student_name.short_description = 'Student'

    def get_event_title(self, obj):
        return obj.event.title
    get_event_title.short_description = 'Event'
