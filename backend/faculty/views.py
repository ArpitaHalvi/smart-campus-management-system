from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.filters import SearchFilter
from rest_framework.pagination import PageNumberPagination

from accounts.permissions import IsAdmin, IsAdminOrFaculty
from .models import Faculty
from .serializers import FacultySerializer


class FacultyPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class FacultyListCreateView(ListCreateAPIView):

    queryset = Faculty.objects.select_related('user', 'department')
    serializer_class = FacultySerializer
    pagination_class = FacultyPagination

    filter_backends = [SearchFilter]
    search_fields = [
        'employee_id',
        'user__first_name',
        'user__last_name',
        'user__email'
    ]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsAdminOrFaculty()]

    def get_queryset(self):
        queryset = super().get_queryset()

        department = self.request.query_params.get('department')
        designation = self.request.query_params.get('designation')

        if department:
            queryset = queryset.filter(department_id=department)

        if designation:
            queryset = queryset.filter(designation__icontains=designation)

        return queryset


class FacultyDetailView(RetrieveUpdateAPIView):

    queryset = Faculty.objects.select_related('user', 'department')
    serializer_class = FacultySerializer
    http_method_names = ['get', 'patch']

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAdmin()]
        return [IsAdminOrFaculty()]
