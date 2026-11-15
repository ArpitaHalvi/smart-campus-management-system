from django.contrib import admin
from .models import Assignment, AssignmentSubmission


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'semester',
        'section',
        'deadline',
        'is_published',
        'is_archived',
        'created_by',
        'created_at'
    )
    list_filter = (
        'is_published',
        'is_archived',
        'allow_resubmission',
        'semester',
        'section',
        'created_at'
    )
    search_fields = ('title', 'description', 'section__name')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'category')
        }),
        ('Academic Details', {
            'fields': ('semester', 'section', 'subject')
        }),
        ('Assignment Details', {
            'fields': ('deadline', 'max_marks', 'attachment')
        }),
        ('Management', {
            'fields': ('created_by', 'is_published', 'is_archived', 'allow_resubmission')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        'get_student_name',
        'get_assignment_title',
        'status',
        'submitted_at',
        'marks_obtained',
        'feedback_visible'
    )
    list_filter = (
        'status',
        'feedback_visible',
        'submitted_at',
        'assignment__semester'
    )
    search_fields = (
        'student__user__username',
        'student__enrollment_number',
        'assignment__title'
    )
    readonly_fields = ('created_at', 'updated_at', 'submitted_at')

    fieldsets = (
        ('Submission', {
            'fields': ('assignment', 'student', 'submission_file', 'submitted_at')
        }),
        ('Evaluation', {
            'fields': ('marks_obtained', 'feedback', 'feedback_visible')
        }),
        ('Status', {
            'fields': ('status', 'revised_at')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def get_student_name(self, obj):
        return obj.student.user.get_full_name() or obj.student.enrollment_number
    get_student_name.short_description = 'Student'

    def get_assignment_title(self, obj):
        return obj.assignment.title
    get_assignment_title.short_description = 'Assignment'
