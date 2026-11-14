
from django.core.exceptions import ObjectDoesNotExist

from rest_framework import generics
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import ValidationError

from accounts.permissions import IsAdmin
from .models import Timetable
from .serializers import TimetableSerializer


class IsAdminFacultyOrStudent(BasePermission):

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.role in ['ADMIN', 'FACULTY', 'STUDENT']
        )


def get_user_timetable(user):

    queryset = Timetable.objects.select_related(
        'section', 'subject', 'faculty', 'faculty__user'
    )

    if user.role == 'FACULTY':
        try:
            faculty = user.faculty_profile
            return queryset.filter(faculty=faculty)
        except ObjectDoesNotExist:
            return queryset.none()

    if user.role == 'STUDENT':
        try:
            student = user.student_profile

            if student.record_status != 'ACTIVE' or not student.section:
                return queryset.none()

            return queryset.filter(section=student.section)

        except ObjectDoesNotExist:
            return queryset.none()

    return queryset


def filter_timetable(queryset, request):

    day = request.query_params.get('day')

    if day:
        valid_days = [choice[0] for choice in Timetable.Day.choices]

        if day.upper() not in valid_days:
            raise ValidationError({
                'day': 'Enter a valid day, such as MONDAY or TUESDAY.'
            })

        queryset = queryset.filter(day=day.upper())

    # Only admins can filter by other sections or faculty members.
    if request.user.role == 'ADMIN':

        section_id = request.query_params.get('section')
        faculty_id = request.query_params.get('faculty')

        if section_id:
            queryset = queryset.filter(section_id=section_id)

        if faculty_id:
            queryset = queryset.filter(faculty_id=faculty_id)

    return queryset


class TimetableListCreateView(generics.ListCreateAPIView):

    serializer_class = TimetableSerializer

    def get_queryset(self):
        queryset = get_user_timetable(self.request.user)
        return filter_timetable(queryset, self.request)

    def get_permissions(self):

        if self.request.method == 'POST':
            return [IsAdmin()]

        return [IsAdminFacultyOrStudent()]


class TimetableDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = TimetableSerializer

    def get_queryset(self):
        return get_user_timetable(self.request.user)

    def get_permissions(self):

        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsAdmin()]

        return [IsAdminFacultyOrStudent()]

    http_method_names = ['get', 'patch', 'delete', 'head', 'options']


class MyTimetableView(generics.ListAPIView):

    serializer_class = TimetableSerializer
    permission_classes = [IsAdminFacultyOrStudent]

    def get_queryset(self):
        queryset = get_user_timetable(self.request.user)
        return filter_timetable(queryset, self.request)
