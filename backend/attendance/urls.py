
from django.urls import path
from . import views

urlpatterns = [
    # Attendance sessions
    path(
        'sessions/',
        views.AttendanceSessionListCreateView.as_view(),
        name='attendance-session-list'
    ),
    path(
        'sessions/<int:pk>/',
        views.AttendanceSessionDetailView.as_view(),
        name='attendance-session-detail'
    ),
    path(
        'sessions/<int:pk>/students/',
        views.SessionStudentListView.as_view(),
        name='attendance-session-students'
    ),

    # Attendance records
    path(
        'records/',
        views.AttendanceRecordListCreateView.as_view(),
        name='attendance-record-list'
    ),
    path(
        'records/bulk/',
        views.BulkAttendanceView.as_view(),
        name='attendance-bulk'
    ),
    path(
        'records/<int:pk>/',
        views.AttendanceRecordDetailView.as_view(),
        name='attendance-record-detail'
    ),

    # Attendance correction history
    path(
        'corrections/',
        views.AttendanceCorrectionListView.as_view(),
        name='attendance-correction-list'
    ),

    # Attendance reports
    path(
        'reports/student/',
        views.StudentAttendanceReportView.as_view(),
        name='student-attendance-report'
    ),
    path(
        'reports/subject/',
        views.SubjectAttendanceReportView.as_view(),
        name='subject-attendance-report'
    ),
    path(
        'reports/monthly/',
        views.MonthlyAttendanceReportView.as_view(),
        name='monthly-attendance-report'
    ),
]
