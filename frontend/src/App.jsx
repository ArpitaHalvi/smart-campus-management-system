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
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
