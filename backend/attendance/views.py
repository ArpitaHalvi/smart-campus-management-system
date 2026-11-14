
from django.shortcuts import get_object_or_404
from django.db import transaction
from drf_spectacular.utils import extend_schema, OpenApiParameter

from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import BasePermission

from accounts.permissions import IsAdminOrFaculty
from students.models import Student

from .models import AttendanceSession, AttendanceRecord, AttendanceCorrection
from .serializers import (
    AttendanceSessionSerializer,
    AttendanceRecordSerializer,
    AttendanceCorrectionSerializer,
)


# Allow students to view their own attendance history.
class IsAdminFacultyOrStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ['ADMIN', 'FACULTY', 'STUDENT']
        )


# Faculty members can access only their own sessions.
def get_accessible_sessions(user):
    sessions = AttendanceSession.objects.all()

    if user.role == 'FACULTY':
        return sessions.filter(faculty__user=user)

    return sessions


# Common attendance calculation.
def calculate_statistics(records):
    total = len(records)

    present = sum(1 for record in records if record.status == 'PRESENT')
    late = sum(1 for record in records if record.status == 'LATE')
    absent = sum(1 for record in records if record.status == 'ABSENT')

    attended = present + late

    percentage = round((attended / total) * 100, 2) if total else 0

    return {
        'total_sessions': total,
        'present': present,
        'late': late,
        'absent': absent,
        'attended': attended,
        'attendance_percentage': percentage,
    }


# Create and view attendance sessions.
class AttendanceSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAdminOrFaculty]

    def get_queryset(self):
        queryset = get_accessible_sessions(
            self.request.user
        ).select_related('subject', 'section', 'faculty')

        section = self.request.query_params.get('section')
        subject = self.request.query_params.get('subject')
        attendance_date = self.request.query_params.get('date')

        if section:
            queryset = queryset.filter(section_id=section)

        if subject:
            queryset = queryset.filter(subject_id=subject)

        if attendance_date:
            queryset = queryset.filter(attendance_date=attendance_date)

        return queryset

    def perform_create(self, serializer):
        faculty = serializer.validated_data['faculty']

        if (
            self.request.user.role == 'FACULTY'
            and faculty.user_id != self.request.user.id
        ):
            raise PermissionDenied(
                "Faculty members can create sessions only for themselves."
            )

        serializer.save()


# View or update an attendance session.
class AttendanceSessionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAdminOrFaculty]
    http_method_names = ['get', 'patch']

    def get_queryset(self):
        return get_accessible_sessions(self.request.user)

    def perform_update(self, serializer):
        faculty = serializer.validated_data.get(
            'faculty',
            serializer.instance.faculty
        )

        if (
            self.request.user.role == 'FACULTY'
            and faculty.user_id != self.request.user.id
        ):
            raise PermissionDenied(
                "You cannot assign this session to another faculty member."
            )

        serializer.save()


# Load active students belonging to a session's section.
class SessionStudentListView(APIView):
    permission_classes = [IsAdminOrFaculty]

    def get(self, request, pk):
        session = get_object_or_404(
            get_accessible_sessions(request.user),
            pk=pk
        )

        students = Student.objects.filter(
            section=session.section,
            record_status='ACTIVE'
        ).select_related('user').order_by('enrollment_number')

        existing_records = {
            record.student_id: record.status
            for record in AttendanceRecord.objects.filter(session=session)
        }

        student_list = []

        for student in students:
            student_list.append({
                'id': student.id,
                'enrollment_number': student.enrollment_number,
                'name': student.user.get_full_name(),
                'status': existing_records.get(student.id),
            })

        return Response(student_list)


# Create and view individual attendance records.
class AttendanceRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdminOrFaculty]

    def get_queryset(self):
        queryset = AttendanceRecord.objects.filter(
            session__in=get_accessible_sessions(self.request.user)
        ).select_related('session', 'student', 'student__user')

        session = self.request.query_params.get('session')
        student = self.request.query_params.get('student')
        status = self.request.query_params.get('status')

        if session:
            queryset = queryset.filter(session_id=session)

        if student:
            queryset = queryset.filter(student_id=student)

        if status:
            queryset = queryset.filter(status=status)

        return queryset

    def perform_create(self, serializer):
        session = serializer.validated_data['session']

        if not get_accessible_sessions(self.request.user).filter(
            pk=session.pk
        ).exists():
            raise PermissionDenied(
                "You cannot mark attendance for this session."
            )

        serializer.save()


# View or correct an attendance record.
class AttendanceRecordDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdminOrFaculty]
    http_method_names = ['get', 'patch']

    def get_queryset(self):
        return AttendanceRecord.objects.filter(
            session__in=get_accessible_sessions(self.request.user)
        )

    def perform_update(self, serializer):
        record = self.get_object()
        previous_status = record.status

        new_status = serializer.validated_data.get(
            'status',
            previous_status
        )

        reason = self.request.data.get('correction_reason', '').strip()

        if new_status != previous_status and not reason:
            raise ValidationError(
                "Please provide a reason for correcting attendance."
            )

        updated_record = serializer.save()

        if new_status != previous_status:
            AttendanceCorrection.objects.create(
                attendance_record=updated_record,
                previous_status=previous_status,
                new_status=new_status,
                reason=reason,
                updated_by=self.request.user
            )


# View attendance correction history.
class AttendanceCorrectionListView(generics.ListAPIView):
    serializer_class = AttendanceCorrectionSerializer
    permission_classes = [IsAdminOrFaculty]

    def get_queryset(self):
        queryset = AttendanceCorrection.objects.filter(
            attendance_record__session__in=get_accessible_sessions(
                self.request.user
            )
        ).select_related('attendance_record', 'updated_by')

        record_id = self.request.query_params.get('record')

        if record_id:
            queryset = queryset.filter(
                attendance_record_id=record_id
            )

        return queryset


# Mark attendance for multiple students in one request.
class BulkAttendanceView(APIView):
    permission_classes = [IsAdminOrFaculty]

    @transaction.atomic
    def post(self, request):
        session_id = request.data.get('session')
        records = request.data.get('records')

        if not session_id or not isinstance(records, list) or not records:
            raise ValidationError(
                "Session and a non-empty records list are required."
            )

        session = get_object_or_404(
            get_accessible_sessions(request.user),
            pk=session_id
        )

        if not all(isinstance(item, dict) for item in records):
            raise ValidationError(
                "Each attendance record must be an object."
            )

        student_ids = [item.get('student') for item in records]

        if (
            None in student_ids
            or len(student_ids) != len(set(student_ids))
        ):
            raise ValidationError(
                "Each student must appear only once in the request."
            )

        existing_ids = AttendanceRecord.objects.filter(
            session=session,
            student_id__in=student_ids
        ).values_list('student_id', flat=True)

        if existing_ids:
            raise ValidationError(
                "Attendance already exists for one or more students."
            )

        saved_records = []

        for item in records:
            data = {
                **item,
                'session': session.id
            }

            serializer = AttendanceRecordSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            saved_records.append(serializer.save())

        return Response(
            AttendanceRecordSerializer(
                saved_records,
                many=True
            ).data,
            status=201
        )



# View attendance history for one student.
class StudentAttendanceReportView(APIView):
    permission_classes = [IsAdminFacultyOrStudent]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='student',
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Student ID. Required for Admin and Faculty. Students automatically view their own report.'
            ),
            OpenApiParameter(
                name='subject',
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Filter attendance by subject ID.'
            ),
            OpenApiParameter(
                name='month',
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Filter by month (1-12).'
            ),
            OpenApiParameter(
                name='year',
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Filter by year.'
            ),
        ]
    )
    def get(self, request):
        if request.user.role == 'STUDENT':
            student = get_object_or_404(
                Student,
                user=request.user
            )
        else:
            student_id = request.query_params.get('student')

            if not student_id:
                raise ValidationError(
                    "Please provide a student ID."
                )

            student = get_object_or_404(Student, pk=student_id)

        queryset = AttendanceRecord.objects.filter(
            student=student
        ).select_related(
            'session',
            'session__subject',
            'student'
        )

        if request.user.role == 'FACULTY':
            queryset = queryset.filter(
                session__in=get_accessible_sessions(request.user)
            )

        subject = request.query_params.get('subject')
        month = request.query_params.get('month')
        year = request.query_params.get('year')

        if subject:
            queryset = queryset.filter(session__subject_id=subject)

        if month:
            try:
                month = int(month)
                if month < 1 or month > 12:
                    raise ValueError
            except ValueError:
                raise ValidationError("Month must be between 1 and 12.")

            queryset = queryset.filter(
                session__attendance_date__month=month
            )

        if year:
            try:
                year = int(year)
            except ValueError:
                raise ValidationError("Year must be a valid number.")

            queryset = queryset.filter(
                session__attendance_date__year=year
            )

        records = list(queryset.order_by(
            '-session__attendance_date'
        ))

        return Response({
            'student_id': student.id,
            'student_name': student.user.get_full_name(),
            'enrollment_number': student.enrollment_number,
            **calculate_statistics(records),
            'records': AttendanceRecordSerializer(
                records,
                many=True
            ).data
        })


# View attendance statistics for a subject.
class SubjectAttendanceReportView(APIView):
    permission_classes = [IsAdminOrFaculty]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='subject',
                type=int,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Subject ID.'
            ),
            OpenApiParameter(
                name='section',
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Optional section ID.'
            ),
        ]
    )
    def get(self, request):
        subject_id = request.query_params.get('subject')

        if not subject_id:
            raise ValidationError(
                "Please provide a subject ID."
            )

        sessions = get_accessible_sessions(request.user)

        queryset = AttendanceRecord.objects.filter(
            session__in=sessions,
            session__subject_id=subject_id
        ).select_related(
            'student',
            'student__user',
            'session'
        )

        section = request.query_params.get('section')

        if section:
            queryset = queryset.filter(
                session__section_id=section
            )

        records = list(queryset)

        student_data = {}

        for record in records:
            student_id = record.student_id

            if student_id not in student_data:
                student_data[student_id] = {
                    'student_id': student_id,
                    'name': record.student.user.get_full_name(),
                    'enrollment_number': record.student.enrollment_number,
                    'records': []
                }

            student_data[student_id]['records'].append(record)

        student_report = []

        for data in student_data.values():
            student_report.append({
                'student_id': data['student_id'],
                'name': data['name'],
                'enrollment_number': data['enrollment_number'],
                **calculate_statistics(data['records'])
            })

        return Response({
            'subject_id': int(subject_id),
            'total_students': len(student_report),
            **calculate_statistics(records),
            'student_report': student_report
        })


# View monthly attendance statistics.
class MonthlyAttendanceReportView(APIView):
    permission_classes = [IsAdminOrFaculty]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='month',
                type=int,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Month (1-12).'
            ),
            OpenApiParameter(
                name='year',
                type=int,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Year.'
            ),
            OpenApiParameter(
                name='subject',
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Optional subject ID.'
            ),
            OpenApiParameter(
                name='section',
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Optional section ID.'
            ),
        ]
    )
    def get(self, request):
        month = request.query_params.get('month')
        year = request.query_params.get('year')

        if not month or not year:
            raise ValidationError(
                "Both month and year are required."
            )

        try:
            month = int(month)
            year = int(year)

            if month < 1 or month > 12:
                raise ValueError

        except ValueError:
            raise ValidationError(
                "Please provide a valid month and year."
            )

        queryset = AttendanceRecord.objects.filter(
            session__in=get_accessible_sessions(request.user),
            session__attendance_date__month=month,
            session__attendance_date__year=year
        ).select_related(
            'student',
            'student__user',
            'session'
        )

        subject = request.query_params.get('subject')
        section = request.query_params.get('section')

        if subject:
            queryset = queryset.filter(
                session__subject_id=subject
            )

        if section:
            queryset = queryset.filter(
                session__section_id=section
            )

        records = list(queryset)

        student_data = {}
        daily_data = {}

        for record in records:
            student_id = record.student_id
            date = str(record.session.attendance_date)

            if student_id not in student_data:
                student_data[student_id] = {
                    'student_id': student_id,
                    'name': record.student.user.get_full_name(),
                    'enrollment_number': record.student.enrollment_number,
                    'records': []
                }

            student_data[student_id]['records'].append(record)

            if date not in daily_data:
                daily_data[date] = {
                    'date': date,
                    'present': 0,
                    'late': 0,
                    'absent': 0,
                    'total': 0
                }

            daily_data[date][record.status.lower()] += 1
            daily_data[date]['total'] += 1

        student_report = []

        for data in student_data.values():
            student_report.append({
                'student_id': data['student_id'],
                'name': data['name'],
                'enrollment_number': data['enrollment_number'],
                **calculate_statistics(data['records'])
            })

        return Response({
            'month': month,
            'year': year,
            **calculate_statistics(records),
            'student_report': student_report,
            'daily_report': sorted(
                daily_data.values(),
                key=lambda item: item['date']
            )
        })
