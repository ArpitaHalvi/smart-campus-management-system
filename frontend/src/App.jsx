import { useCallback, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Loader from "./pages/Loader";
import Intro from "./pages/Intro";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminLayout from "./components/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import Users from "./pages/admin/Users";
import AddUser from "./pages/admin/AddUser";
import RoleHome from "./pages/RoleHome";
import UserLayout from "./components/UserLayout";
import StudentsList from "./components/students/StudentsList";
import RegisterStudent from "./components/students/RegisterStudent";
import StudentProfile from "./components/students/StudentProfile";
import ImportStudents from "./components/students/ImportStudents";
import MyRecord from "./components/students/MyRecord";
import StudentDashboard from "./components/student-dashboard/StudentDashboard";
import DepartmentsList from "./components/departments/DepartmentsList";
import DepartmentForm from "./components/departments/DepartmentForm";
import AcademicsPage from "./components/academics/AcademicsPage";
import YearsTab from "./components/academics/YearsTab";
import SemestersTab from "./components/academics/SemestersTab";
import CoursesTab from "./components/academics/CoursesTab";
import SectionsTab from "./components/academics/SectionsTab";
import ProfilePage from "./components/ProfilePage";

// Assignment components
import AssignmentsList from "./components/assignments/AssignmentsList";
import AssignmentDetail from "./components/assignments/AssignmentDetail";
import AssignmentForm from "./components/assignments/AssignmentForm";
import SubmissionUpload from "./components/assignments/SubmissionUpload";
import SubmissionsList from "./components/assignments/SubmissionsList";
import EvaluationForm from "./components/assignments/EvaluationForm";

// Notice components
import NoticesList from "./components/notices/NoticesList";
import NoticeDetail from "./components/notices/NoticeDetail";
import NoticeForm from "./components/notices/NoticeForm";

// Event components
import EventsList from "./components/events/EventsList";
import EventDetail from "./components/events/EventDetail";
import EventForm from "./components/events/EventForm";
import EventRegistrations from "./components/events/EventRegistrations";

// Loader animation, then the intro screen (the home page)
function Splash() {
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const handleLeave = useCallback(() => setShowIntro(true), []);
  const handleDone = useCallback(() => setLoading(false), []);

  return (
    <>
      {showIntro && <Intro />}
      {loading && <Loader onLeave={handleLeave} onDone={handleDone} />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="users" element={<Users />} />
            <Route path="users/new" element={<AddUser />} />
            <Route path="students" element={<StudentsList />} />
            <Route path="students/new" element={<RegisterStudent />} />
            <Route path="students/import" element={<ImportStudents />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="departments" element={<DepartmentsList />} />
            <Route path="departments/new" element={<DepartmentForm />} />
            <Route path="departments/:id/edit" element={<DepartmentForm />} />
            <Route path="academics" element={<AcademicsPage />}>
              <Route index element={<Navigate to="years" replace />} />
              <Route path="years" element={<YearsTab />} />
              <Route path="semesters" element={<SemestersTab />} />
              <Route path="courses" element={<CoursesTab />} />
              <Route path="sections" element={<SectionsTab />} />
            </Route>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route
            path="/faculty"
            element={
              <ProtectedRoute roles={["FACULTY"]}>
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleHome />} />
            <Route path="students" element={<StudentsList />} />
            <Route path="students/new" element={<RegisterStudent />} />
            <Route path="students/import" element={<ImportStudents />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="departments" element={<DepartmentsList />} />
            <Route path="academics" element={<AcademicsPage />}>
              <Route index element={<Navigate to="years" replace />} />
              <Route path="years" element={<YearsTab />} />
              <Route path="semesters" element={<SemestersTab />} />
              <Route path="courses" element={<CoursesTab />} />
              <Route path="sections" element={<SectionsTab />} />
            </Route>

            {/* Assignments */}
            <Route path="assignments" element={<AssignmentsList />} />
            <Route path="assignments/new" element={<AssignmentForm />} />
            <Route path="assignments/:id" element={<AssignmentDetail />} />
            <Route path="assignments/:id/edit" element={<AssignmentForm />} />
            <Route path="assignments/:id/submissions" element={<SubmissionsList />} />
            <Route path="assignments/:id/submissions/:submissionId/evaluate" element={<EvaluationForm />} />

            {/* Notices */}
            <Route path="notices" element={<NoticesList />} />
            <Route path="notices/new" element={<NoticeForm />} />
            <Route path="notices/:id" element={<NoticeDetail />} />
            <Route path="notices/:id/edit" element={<NoticeForm />} />

            {/* Events */}
            <Route path="events" element={<EventsList />} />
            <Route path="events/new" element={<EventForm />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="events/:id/edit" element={<EventForm />} />
            <Route path="events/:id/registrations" element={<EventRegistrations />} />

            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="record" element={<MyRecord />} />

            {/* Assignments */}
            <Route path="assignments" element={<AssignmentsList />} />
            <Route path="assignments/:id" element={<AssignmentDetail />} />
            <Route path="assignments/:id/submit" element={<SubmissionUpload />} />

            {/* Notices */}
            <Route path="notices" element={<NoticesList />} />
            <Route path="notices/:id" element={<NoticeDetail />} />

            {/* Events */}
            <Route path="events" element={<EventsList />} />
            <Route path="events/:id" element={<EventDetail />} />

            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
