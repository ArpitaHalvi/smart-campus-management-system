from django.contrib import admin

from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('enrollment_number', 'user', 'course', 'department', 'year_of_study', 'record_status')
    list_filter = ('record_status', 'department', 'course', 'year_of_study')
    search_fields = ('enrollment_number', 'user__username', 'user__email',
                     'user__first_name', 'user__last_name')
    raw_id_fields = ('user', 'created_by')
