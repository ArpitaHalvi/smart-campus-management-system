import {
  BookOpen,
  Building2,
  GraduationCap,
  House,
  IdCard,
  LayoutGrid,
  UserRound,
  Users,
} from "lucide-react";

/** The menu for each role. The sidebar, top bar and mobile drawer all read this. */
export const NAV = {
  ADMIN: [
    { to: "/admin", label: "Overview", icon: LayoutGrid, end: true },
    { to: "/admin/students", label: "Students", icon: GraduationCap },
    { to: "/admin/departments", label: "Departments", icon: Building2 },
    { to: "/admin/academics", label: "Academics", icon: BookOpen },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/profile", label: "Profile", icon: UserRound },
  ],
  FACULTY: [
    { to: "/faculty", label: "Home", icon: House, end: true },
    { to: "/faculty/students", label: "Students", icon: GraduationCap },
    { to: "/faculty/departments", label: "Departments", icon: Building2 },
    { to: "/faculty/academics", label: "Academics", icon: BookOpen },
    { to: "/faculty/profile", label: "Profile", icon: UserRound },
  ],
  STUDENT: [
    { to: "/student", label: "Home", icon: House, end: true },
    { to: "/student/record", label: "My record", icon: IdCard },
    { to: "/student/profile", label: "Profile", icon: UserRound },
  ],
};
