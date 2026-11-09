from django.db.models import Count, Q
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsAdminOrFaculty
from students.models import Student

from .models import AcademicYear, Course, Department, Section, Semester
from .serializers import (
    AcademicYearSerializer,
    CourseSerializer,
    DepartmentSerializer,
    SectionSerializer,
    SemesterSerializer,
)


class AcademicsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'   # dropdowns ask for page_size=200
    max_page_size = 200


def _active_students():
    """Counts active students through the foreign key (department, course or section)."""
    return Count('students', filter=Q(students__record_status=Student.RecordStatus.ACTIVE))


class _Read(APIView):
    """Admins and faculty can read; only admins can write."""

    def get_permissions(self):
        write = self.request.method in ('POST', 'PATCH')
        return [IsAdmin()] if write else [IsAdminOrFaculty()]


class _ListCreate(_Read, ListCreateAPIView):
    pagination_class = AcademicsPagination


class _Detail(_Read, RetrieveUpdateAPIView):
    http_method_names = ['get', 'patch']   # nothing here is ever deleted


# ------------------------------------------------------------------ departments
class DepartmentListCreateView(_ListCreate):
    queryset = Department.objects.select_related('head').annotate(active_students=_active_students())
    serializer_class = DepartmentSerializer
    filter_backends = [SearchFilter]
    search_fields = ['name', 'code', 'description']


class DepartmentDetailView(_Detail):
    queryset = Department.objects.select_related('head').annotate(active_students=_active_students())
    serializer_class = DepartmentSerializer


# ------------------------------------------------------------------ academic years
class AcademicYearListCreateView(_ListCreate):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer


class AcademicYearDetailView(_Detail):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer


# ------------------------------------------------------------------ semesters
class SemesterListCreateView(_ListCreate):
    serializer_class = SemesterSerializer

    def get_queryset(self):
        qs = Semester.objects.select_related('academic_year')
        year = self.request.query_params.get('year')
        return qs.filter(academic_year_id=year) if year and year.isdigit() else qs


class SemesterDetailView(_Detail):
    queryset = Semester.objects.select_related('academic_year')
    serializer_class = SemesterSerializer


# ------------------------------------------------------------------ courses
class CourseListCreateView(_ListCreate):
    serializer_class = CourseSerializer
    filter_backends = [SearchFilter]
    search_fields = ['name', 'code', 'description']

    def get_queryset(self):
        qs = Course.objects.select_related('department').annotate(active_students=_active_students())
        department = self.request.query_params.get('department')
        return qs.filter(department_id=department) if department and department.isdigit() else qs


class CourseDetailView(_Detail):
    queryset = Course.objects.select_related('department').annotate(active_students=_active_students())
    serializer_class = CourseSerializer


# ------------------------------------------------------------------ sections
class SectionListCreateView(_ListCreate):
    serializer_class = SectionSerializer

    def get_queryset(self):
        qs = Section.objects.select_related('course', 'semester__academic_year').annotate(
            active_students=_active_students()
        )
        params = self.request.query_params
        for param, field in (('course', 'course_id'), ('semester', 'semester_id'), ('year', 'semester__academic_year_id')):
            value = params.get(param)
            if value and value.isdigit():
                qs = qs.filter(**{field: int(value)})
        return qs


class SectionDetailView(_Detail):
    queryset = Section.objects.select_related('course', 'semester__academic_year').annotate(
        active_students=_active_students()
    )
    serializer_class = SectionSerializer


# ------------------------------------------------------------------ helpers
class FacultyOptionsView(APIView):
    """GET -> active faculty members, to pick a department head from."""

    permission_classes = [IsAdmin]

    def get(self, request):
        faculty = User.objects.filter(
            role=User.Role.FACULTY, status=User.Status.ACTIVE
        ).order_by('first_name', 'username')
        return Response([
            {'id': u.id, 'name': u.get_full_name() or u.username} for u in faculty
        ])
