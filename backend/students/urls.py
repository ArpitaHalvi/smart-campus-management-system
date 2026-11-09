from django.urls import path

from .views import (
    StudentArchiveView,
    NextStudentIdView,
    StudentEnrollView,
    StudentImportTemplateView,
    StudentImportView,
    StudentDetailView,
    StudentFilterOptionsView,
    StudentListCreateView,
    StudentMeView,
    StudentRestoreView,
)

urlpatterns = [
    path('', StudentListCreateView.as_view(), name='students'),
    path('me/', StudentMeView.as_view(), name='student-me'),
    path('filter-options/', StudentFilterOptionsView.as_view(), name='student-filter-options'),
    path('next-id/', NextStudentIdView.as_view(), name='student-next-id'),
    path('import/', StudentImportView.as_view(), name='student-import'),
    path('import/template/', StudentImportTemplateView.as_view(), name='student-import-template'),
    path('enroll/', StudentEnrollView.as_view(), name='student-enroll'),
    path('<int:pk>/', StudentDetailView.as_view(), name='student-detail'),
    path('<int:pk>/archive/', StudentArchiveView.as_view(), name='student-archive'),
    path('<int:pk>/restore/', StudentRestoreView.as_view(), name='student-restore'),
]
