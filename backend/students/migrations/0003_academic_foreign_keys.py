import django.db.models.deletion
from django.db import migrations, models


def link_academic_records(apps, schema_editor):
    """
    Turn the typed department / program / semester / section values into real
    links. Departments and courses were already registered by name. Typed
    sections become course-level Section rows. A semester number is linked to
    that semester of the current academic year (or the latest year that has
    it); if no such semester record exists the value can't be linked and is
    reported below.
    """
    Student = apps.get_model('students', 'Student')
    Department = apps.get_model('academics', 'Department')
    Course = apps.get_model('academics', 'Course')
    Semester = apps.get_model('academics', 'Semester')
    Section = apps.get_model('academics', 'Section')
    AcademicYear = apps.get_model('academics', 'AcademicYear')

    current = AcademicYear.objects.filter(is_current=True).first()
    unlinked = []

    for student in Student.objects.all():
        changed = []

        if student.legacy_department:
            department = Department.objects.filter(name__iexact=student.legacy_department.strip()).first()
            if department:
                student.department = department
                changed.append('department')

        if student.legacy_program:
            course = Course.objects.filter(name__iexact=student.legacy_program.strip()).first()
            if course:
                student.course = course
                changed.append('course')

        if student.legacy_semester:
            semesters = Semester.objects.filter(number=student.legacy_semester)
            semester = None
            if current:
                semester = semesters.filter(academic_year=current).first()
            semester = semester or semesters.order_by('-academic_year__start_date').first()
            if semester:
                student.semester = semester
                changed.append('semester')
            else:
                unlinked.append(f'{student.enrollment_number}: semester {student.legacy_semester}')

        if student.legacy_section and student.course_id:
            name = student.legacy_section.strip().upper()
            section = (
                Section.objects.filter(course_id=student.course_id, semester_id=student.semester_id, name__iexact=name).first()
                or Section.objects.filter(course_id=student.course_id, semester__isnull=True, name__iexact=name).first()
            )
            if section is None:
                section = Section.objects.create(course_id=student.course_id, name=name)
            student.section = section
            changed.append('section')
        elif student.legacy_section:
            unlinked.append(f'{student.enrollment_number}: section {student.legacy_section} (no course)')

        if changed:
            student.save(update_fields=changed)

    if unlinked:
        print('\n  Could not link (no matching record yet): ' + '; '.join(unlinked))


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0002_academic_structure'),
        ('students', '0002_semester_section'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='student',
            name='students_st_departm_7e0c92_idx',
        ),
        migrations.RenameField('student', 'department', 'legacy_department'),
        migrations.RenameField('student', 'program', 'legacy_program'),
        migrations.RenameField('student', 'semester', 'legacy_semester'),
        migrations.RenameField('student', 'section', 'legacy_section'),
        migrations.AddField(
            model_name='student',
            name='department',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='students', to='academics.department'),
        ),
        migrations.AddField(
            model_name='student',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='students', to='academics.course'),
        ),
        migrations.AddField(
            model_name='student',
            name='semester',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='students', to='academics.semester'),
        ),
        migrations.AddField(
            model_name='student',
            name='section',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='students', to='academics.section'),
        ),
        migrations.RunPython(link_academic_records, migrations.RunPython.noop),
        migrations.RemoveField('student', 'legacy_department'),
        migrations.RemoveField('student', 'legacy_program'),
        migrations.RemoveField('student', 'legacy_semester'),
        migrations.RemoveField('student', 'legacy_section'),
        migrations.AddIndex(
            model_name='student',
            index=models.Index(fields=['department', 'course', 'year_of_study'], name='students_st_departm_77f115_idx'),
        ),
    ]
