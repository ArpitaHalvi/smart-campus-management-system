from django.urls import path

from . import views as v

urlpatterns = [
    path('departments/', v.DepartmentListCreateView.as_view(), name='departments'),
    path('departments/<int:pk>/', v.DepartmentDetailView.as_view(), name='department-detail'),
    path('years/', v.AcademicYearListCreateView.as_view(), name='academic-years'),
    path('years/<int:pk>/', v.AcademicYearDetailView.as_view(), name='academic-year-detail'),
    path('semesters/', v.SemesterListCreateView.as_view(), name='semesters'),
    path('semesters/<int:pk>/', v.SemesterDetailView.as_view(), name='semester-detail'),
    path('courses/', v.CourseListCreateView.as_view(), name='courses'),
    path('courses/<int:pk>/', v.CourseDetailView.as_view(), name='course-detail'),
    path('sections/', v.SectionListCreateView.as_view(), name='sections'),
    path('sections/<int:pk>/', v.SectionDetailView.as_view(), name='section-detail'),
    path('faculty-options/', v.FacultyOptionsView.as_view(), name='faculty-options'),
]
