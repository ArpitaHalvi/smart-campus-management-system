from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView, DestroyAPIView
from rest_framework.filters import SearchFilter
from rest_framework.pagination import PageNumberPagination

from accounts.permissions import IsAdmin, IsAdminOrFaculty
from .models import Subject, SubjectAllocation
from .serializers import SubjectSerializer, SubjectAllocationSerializer


class SubjectPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class SubjectListCreateView(ListCreateAPIView):

    queryset = Subject.objects.select_related(
        'department', 'semester', 'section'
    )

    serializer_class = SubjectSerializer
    pagination_class = SubjectPagination

    filter_backends = [SearchFilter]
    search_fields = ['name', 'code']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]

        return [IsAdminOrFaculty()]

    def get_queryset(self):
        queryset = super().get_queryset()

        department = self.request.query_params.get('department')
        semester = self.request.query_params.get('semester')
        section = self.request.query_params.get('section')

        if department:
            queryset = queryset.filter(department_id=department)

        if semester:
            queryset = queryset.filter(semester_id=semester)

        if section:
            queryset = queryset.filter(section_id=section)

        return queryset


class SubjectDetailView(RetrieveUpdateAPIView):

    queryset = Subject.objects.select_related(
        'department', 'semester', 'section'
    )

    serializer_class = SubjectSerializer
    http_method_names = ['get', 'patch']

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAdmin()]

        return [IsAdminOrFaculty()]

class SubjectAllocationListCreateView(ListCreateAPIView):

    queryset = SubjectAllocation.objects.select_related(
        'subject', 'faculty', 'faculty__user'
    )

    serializer_class = SubjectAllocationSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]

        return [IsAdminOrFaculty()]

    def get_queryset(self):
        queryset = super().get_queryset()

        subject = self.request.query_params.get('subject')
        faculty = self.request.query_params.get('faculty')

        if subject:
            queryset = queryset.filter(subject_id=subject)

        if faculty:
            queryset = queryset.filter(faculty_id=faculty)

        return queryset


class SubjectAllocationDeleteView(DestroyAPIView):

    queryset = SubjectAllocation.objects.all()
    serializer_class = SubjectAllocationSerializer
    permission_classes = [IsAdmin]
