from django.contrib import admin

from .models import AcademicYear, Course, Department, Section, Semester


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'head')
    search_fields = ('name', 'code')
    raw_id_fields = ('head',)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_current')


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'start_date', 'end_date')
    list_filter = ('academic_year',)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'department', 'duration_years')
    search_fields = ('name', 'code')


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'semester', 'capacity')
    list_filter = ('course',)
