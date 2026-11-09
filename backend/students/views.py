from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsAdminOrFaculty, IsStudent

from academics.models import Course, Department, Section

from . import importer
from .models import Student
from .serializers import (
    ArchiveSerializer,
    EnrollSerializer,
    next_enrollment_number,
    StudentRegisterSerializer,
    StudentSerializer,
    StudentUpdateSerializer,
)

BASE_QS = Student.objects.select_related(
    'user', 'department', 'course', 'section', 'semester__academic_year'
)

SEARCH_FIELDS = [
    'user__username', 'user__email', 'user__first_name', 'user__last_name',
    'enrollment_number', 'course__name', 'department__name',
]


def apply_filters(qs, params):
    """
    The list filters: record, department (id), course (id), year,
    semester (number, in any academic year) and section (name).
    """
    record = params.get('record', 'active')
    if record in ('active', 'archived'):
        qs = qs.filter(record_status=record.upper())

    for param, field in (
        ('department', 'department_id'),
        ('course', 'course_id'),
        ('year', 'year_of_study'),
        ('semester', 'semester__number'),
    ):
        value = params.get(param)
        if value and str(value).isdigit():
            qs = qs.filter(**{field: int(value)})

    section = params.get('section')
    if section:
        qs = qs.filter(section__name__iexact=section)
    return qs


def apply_search(qs, text):
    """Every word must appear in at least one searchable field (as the list does)."""
    for term in (text or '').split():
        query = Q()
        for field in SEARCH_FIELDS:
            query |= Q(**{f'{field}__icontains': term})
        qs = qs.filter(query)
    return qs


class StudentListCreateView(ListCreateAPIView):
    """
    GET  -> admin and faculty: paginated students.
            ?search=<name, username, email, student ID, course, department>
            ?record=active (default) | archived | all
            ?department=<id>  ?course=<id>  ?year=<n>  ?semester=<number>  ?section=<name>
    POST -> admin and faculty: register a student (account + record).
    """

    permission_classes = [IsAdminOrFaculty]
    filter_backends = [SearchFilter]
    search_fields = SEARCH_FIELDS

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StudentRegisterSerializer
        return StudentSerializer

    def get_queryset(self):
        return apply_filters(BASE_QS.order_by('-created_at'), self.request.query_params)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        # Answer with the full profile so the client can show it straight away
        return Response(
            StudentSerializer(student).data, status=status.HTTP_201_CREATED
        )


class StudentDetailView(RetrieveUpdateAPIView):
    """GET a student's complete profile; PATCH to edit it (admin and faculty)."""

    permission_classes = [IsAdminOrFaculty]
    queryset = BASE_QS
    http_method_names = ['get', 'patch']

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return StudentUpdateSerializer
        return StudentSerializer

    def patch(self, request, *args, **kwargs):
        student = self.get_object()
        serializer = StudentUpdateSerializer(
            student, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        student.refresh_from_db()
        return Response(StudentSerializer(student).data)


class StudentMeView(APIView):
    """GET -> a signed-in student's own record (read-only)."""

    permission_classes = [IsStudent]

    def get(self, request):
        student = get_object_or_404(BASE_QS, user=request.user)
        return Response(StudentSerializer(student).data)


class StudentArchiveView(APIView):
    """
    POST {"reason"?} -> admin archives a student: the record is hidden from the
    default list and the account is deactivated. Nothing is deleted.
    """

    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request, pk):
        student = get_object_or_404(BASE_QS.select_for_update(of=('self',)), pk=pk)
        if student.record_status == Student.RecordStatus.ARCHIVED:
            return Response(
                {'detail': 'This student is already archived.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ArchiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('reason', '').strip()

        student.record_status = Student.RecordStatus.ARCHIVED
        student.archived_at = timezone.now()
        student.archive_reason = reason
        student.save()

        student.user.status = User.Status.INACTIVE
        student.user.status_reason = reason or 'Record archived'
        student.user.save()
        return Response(StudentSerializer(student).data)


class StudentRestoreView(APIView):
    """POST -> admin brings an archived student back and re-enables the account."""

    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request, pk):
        student = get_object_or_404(BASE_QS.select_for_update(of=('self',)), pk=pk)
        if student.record_status != Student.RecordStatus.ARCHIVED:
            return Response(
                {'detail': 'This student is not archived.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        student.record_status = Student.RecordStatus.ACTIVE
        student.archived_at = None
        student.archive_reason = ''
        student.save()

        student.user.status = User.Status.ACTIVE
        student.user.status_reason = ''
        student.user.save()
        return Response(StudentSerializer(student).data)


class StudentFilterOptionsView(APIView):
    """GET -> the departments, courses and section names to fill the filter dropdowns."""

    permission_classes = [IsAdminOrFaculty]

    def get(self, request):
        sections = (
            Section.objects.order_by('name').values_list('name', flat=True).distinct()
        )
        return Response({
            'departments': list(Department.objects.values('id', 'name')),
            'courses': list(Course.objects.values('id', 'name')),
            'sections': sorted({name.upper() for name in sections}),
        })


class NextStudentIdView(APIView):
    """GET -> the ID the next registration would get. A preview, not a reservation."""

    permission_classes = [IsAdminOrFaculty]

    def get(self, request):
        return Response({'enrollment_number': next_enrollment_number()})


class StudentImportView(APIView):
    """
    POST multipart `file` (a CSV).
      ?dry_run=true  -> validate only: a row-by-row preview, nothing is created
      otherwise      -> create every valid row; invalid rows are skipped and listed
    Answers with the new accounts' login details (the only time the generated
    passwords can be seen).
    """

    permission_classes = [IsAdminOrFaculty]
    parser_classes = [MultiPartParser]

    def post(self, request):
        upload = request.FILES.get('file')
        if upload is None:
            return Response(
                {'detail': 'Choose a CSV file to import.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            rows, ignored = importer.parse_csv(upload)
        except importer.ImportFileError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        results = importer.validate(rows, request)
        valid = sum(r['ok'] for r in results)
        body = {
            'summary': {'total': len(results), 'valid': valid, 'invalid': len(results) - valid},
            'ignored_columns': ignored,
            'rows': [
                {k: r[k] for k in ('row', 'ok', 'errors', 'generated_password', 'display')}
                for r in results
            ],
        }

        if request.query_params.get('dry_run', '').lower() in ('1', 'true', 'yes'):
            return Response(body)

        if valid == 0:
            body['detail'] = 'None of the rows are valid, so nothing was imported.'
            return Response(body, status=status.HTTP_400_BAD_REQUEST)
        try:
            created = importer.commit(results, request.user)
        except importer.ImportConflict as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)

        body['created'] = created
        return Response(body, status=status.HTTP_201_CREATED)


class StudentImportTemplateView(APIView):
    """GET -> a ready-to-fill CSV with the expected headings and two examples."""

    permission_classes = [IsAdminOrFaculty]

    def get(self, request):
        import csv

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="student-import-template.csv"'
        response.write('\ufeff')  # lets Excel open it as UTF-8
        writer = csv.writer(response)
        writer.writerow(importer.TEMPLATE_HEADER)
        writer.writerows(importer.TEMPLATE_ROWS)
        return response


class StudentEnrollView(APIView):
    """
    POST -> assign students to a department, course, year, semester and/or section.

        {"student_ids": [3, 5, 8], "semester": 12, "section": 4}
        {"filters": {"department": "2", "year": "2"}, "semester": 12}

    The academic fields are ids of records under Academics. Only the fields
    sent are changed, and archived students are left alone. A section belongs
    to one course (and maybe one semester), so it can't be given to students
    who are in a different one.
    """

    permission_classes = [IsAdminOrFaculty]

    @transaction.atomic
    def post(self, request):
        serializer = EnrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        active = BASE_QS.filter(record_status=Student.RecordStatus.ACTIVE)
        skipped_archived = 0
        if data.get('student_ids'):
            ids = set(data['student_ids'])
            matched = active.filter(pk__in=ids)
            skipped_archived = Student.objects.filter(
                pk__in=ids, record_status=Student.RecordStatus.ARCHIVED
            ).count()
        else:
            filters = {k: v for k, v in data['filters'].items() if k != 'record'}
            matched = apply_search(apply_filters(active, filters), filters.get('search'))

        changes = {f: data[f] for f in ('department', 'course', 'semester', 'section', 'year_of_study') if data.get(f) is not None}

        section = data.get('section')
        if section is not None:
            # Don't move students into a section of another course or semester
            if 'course' not in changes:
                clash = matched.exclude(course__isnull=True).exclude(course=section.course).count()
                if clash:
                    raise ValidationError({'section': (
                        f'{clash} of these students are in a different course than '
                        f'{section.course.name}. Set the course too, or choose another section.'
                    )})
                changes['course'] = section.course
            if section.semester_id and 'semester' not in changes:
                clash = matched.exclude(semester__isnull=True).exclude(semester=section.semester).count()
                if clash:
                    raise ValidationError({'section': (
                        f'{clash} of these students are in a different semester than '
                        f'{section.semester.name}. Set the semester too, or choose another section.'
                    )})
                changes['semester'] = section.semester

        pks = list(matched.values_list('pk', flat=True))
        # update() skips auto_now, so stamp the change ourselves
        Student.objects.filter(pk__in=pks).update(updated_at=timezone.now(), **changes)
        return Response({'updated': len(pks), 'skipped_archived': skipped_archived})
