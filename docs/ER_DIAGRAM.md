# Smart Campus: Entity-Relationship Diagram

Database: PostgreSQL (Neon). Backend: Django 6 + DRF.
This file shows **what is built today** and, separately, **what is planned**.
It was generated from the live Django models, so the built part matches the code.

Renders on GitHub and in VS Code (Markdown Preview Mermaid Support extension).

---

## 1. Status at a glance

| App | Models | Status |
|---|---|---|
| `accounts` | `User` | Built |
| `students` | `Student` | Built |
| `academics` | `Department`, `AcademicYear`, `Semester`, `Course`, `Section` | Built |
| `faculty` | none | Empty app |
| `attendance` | none | Empty app |
| `timetable` | none | Empty app |
| `assignments` | none | Empty app |
| `notices` | none | Empty app |
| `events` | none | Empty app |
| `dashboard` | none | Empty app (the student dashboard UI exists and uses sample data) |
| `reports` | none | Empty app |

**7 models are built. 8 apps are empty scaffolds.**
(Django's own tables for sessions, admin log and permissions are not shown.)

---

## 2. Built models and their relationships

```mermaid
erDiagram
    User {
        bigint id PK
        string username UK
        string email UK
        string first_name
        string last_name
        string role "ADMIN | FACULTY | STUDENT"
        string status "ACTIVE | SUSPENDED | INACTIVE"
        string status_reason
        bool is_active "derived from status"
        datetime last_login
    }

    Student {
        bigint id PK
        bigint user_id FK, UK "1:1 with User"
        string enrollment_number UK "student ID, SC20260001"
        date date_of_birth
        string gender
        string phone
        text address
        string guardian_name
        string guardian_phone
        bigint department_id FK "nullable"
        bigint course_id FK "nullable"
        smallint year_of_study "1st, 2nd year"
        bigint semester_id FK "nullable"
        bigint section_id FK "nullable"
        date admission_date
        string record_status "ACTIVE | ARCHIVED"
        datetime archived_at
        string archive_reason
        bigint created_by_id FK "nullable, the staff user"
    }

    Department {
        bigint id PK
        string name UK "unique, ignoring case"
        string code UK "optional, unique when set"
        text description
        bigint head_id FK "nullable, a FACULTY user"
    }

    Course {
        bigint id PK
        string name UK "the academic program"
        string code UK "optional, unique when set"
        bigint department_id FK "nullable"
        smallint duration_years
        text description
    }

    AcademicYear {
        bigint id PK
        string name UK "2026-27"
        date start_date
        date end_date
        bool is_current "at most one true"
    }

    Semester {
        bigint id PK
        bigint academic_year_id FK
        smallint number "1 to 12"
        date start_date
        date end_date
    }

    Section {
        bigint id PK
        bigint course_id FK
        bigint semester_id FK "nullable"
        string name "A, B, C"
        smallint capacity "optional"
    }

    User ||--o| Student : "account of"
    User |o--o{ Student : "registered by"
    User |o--o{ Department : "heads"
    Department |o--o{ Course : "offers"
    Department |o--o{ Student : "places"
    Course |o--o{ Student : "enrols"
    AcademicYear ||--o{ Semester : "contains"
    Semester |o--o{ Student : "current term of"
    Course ||--o{ Section : "split into"
    Semester |o--o{ Section : "scopes (optional)"
    Section |o--o{ Student : "groups"
```

### Reading the notation
`||` exactly one, `o|` zero or one, `o{` zero or many, `|{` one or many.
`PK` primary key, `FK` foreign key, `UK` unique.

### Foreign keys and what happens on delete

| From | Column | To | On delete |
|---|---|---|---|
| Student | `user_id` | User | CASCADE (the account owns the record) |
| Student | `created_by_id` | User | SET NULL |
| Student | `department_id` | Department | **PROTECT** |
| Student | `course_id` | Course | **PROTECT** |
| Student | `semester_id` | Semester | **PROTECT** |
| Student | `section_id` | Section | **PROTECT** |
| Department | `head_id` | User | SET NULL |
| Course | `department_id` | Department | PROTECT |
| Semester | `academic_year_id` | AcademicYear | PROTECT |
| Section | `course_id` | Course | PROTECT |
| Section | `semester_id` | Semester | PROTECT |

`PROTECT` means a row that is in use cannot be deleted. Academic records are
also never deleted from the API; students are **archived**, not deleted.

### Rules enforced beyond the foreign keys

- **One current academic year.** A partial unique constraint allows only one
  `AcademicYear` with `is_current = true`.
- **Names are unique ignoring case:** department name/code, course name/code,
  academic year name. Empty codes are allowed more than once.
- **One semester number per year.** Unique on (`academic_year`, `number`).
- **Semesters sit inside their academic year.** Odd semesters (1, 3, 5, 7) may
  overlap each other by design.
- **A section name is unique within its course (and semester).**
- **Student placement is consistent.** A student's section must belong to the
  student's course, and to the student's semester if the section is tied to one.
- **`User.is_active` follows `User.status`.** `status` is the source of truth;
  `is_active` is derived on save.
- **Only the role `STUDENT` has a `Student` row.** Every student account is
  created together with its record.

---

## 3. Planned models (not built yet)

> These are proposals so new modules link to the existing tables correctly.
> Nothing below exists in the database. Names and fields can change.

Link students by `student_id`, and subjects, sections and semesters by id, the
same way `Student` links to `Department` and `Course`. **Do not store names.**

```mermaid
erDiagram
    Student ||--o{ AttendanceRecord : "has"
    Student ||--o{ Submission : "makes"
    Subject ||--o{ AttendanceRecord : "for"
    Subject ||--o{ TimetableEntry : "scheduled as"
    Subject ||--o{ Assignment : "has"
    Subject }o--|| Course : "taught in"
    Subject }o--o| Semester : "taught in"
    Section ||--o{ TimetableEntry : "attends"
    FacultyProfile ||--o{ TimetableEntry : "teaches"
    FacultyProfile ||--o{ Assignment : "sets"
    FacultyProfile }o--o| Department : "belongs to"
    User ||--o| FacultyProfile : "account of"
    Assignment ||--o{ Submission : "receives"
    Section |o--o{ Assignment : "assigned to"
    User ||--o{ Notice : "posts"
    Department |o--o{ Notice : "targets (optional)"
    Course |o--o{ Notice : "targets (optional)"
    User ||--o{ Event : "organises"

    Subject {
        bigint id PK
        string code UK
        string name
        bigint course_id FK
        bigint semester_id FK
    }
    FacultyProfile {
        bigint id PK
        bigint user_id FK, UK
        bigint department_id FK
        string designation
    }
    TimetableEntry {
        bigint id PK
        bigint section_id FK
        bigint subject_id FK
        bigint faculty_id FK
        smallint weekday
        time start_time
        time end_time
        string room
    }
    AttendanceRecord {
        bigint id PK
        bigint student_id FK
        bigint subject_id FK
        date attended_on
        string status "PRESENT | ABSENT | LEAVE"
    }
    Assignment {
        bigint id PK
        bigint subject_id FK
        bigint section_id FK
        bigint created_by_id FK
        string title
        datetime due_at
    }
    Submission {
        bigint id PK
        bigint assignment_id FK
        bigint student_id FK
        datetime submitted_at
        string status
    }
    Notice {
        bigint id PK
        bigint posted_by_id FK
        bigint department_id FK
        bigint course_id FK
        string title
        text body
    }
    Event {
        bigint id PK
        bigint organiser_id FK
        string title
        datetime starts_at
        string venue
    }
```

### What this unlocks in the UI
The student dashboard already has panels for attendance, today's timetable,
assignments, notices and events. They currently read from
`frontend/src/components/student-dashboard/sampleData.js`. When the models
above exist, replace that file's output with API calls. The shapes were
written to match.

---

## 4. Where things live

| Thing | Path |
|---|---|
| Models | `backend/<app>/models.py` |
| Migrations | `backend/<app>/migrations/` |
| API routes | `backend/<app>/urls.py`, mounted under `/api/` in `backend/config/urls.py` |
| API docs (Swagger) | `/api/docs/` when the server is running |
