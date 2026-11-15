import {
  BookOpen,
  Building2,
  Calendar,
  FileText,
  GraduationCap,
  House,
  IdCard,
  LayoutGrid,
  MessageSquare,
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
    { to: "/faculty/assignments", label: "Assignments", icon: FileText },
    { to: "/faculty/notices", label: "Notices", icon: MessageSquare },
    { to: "/faculty/events", label: "Events", icon: Calendar },
    { to: "/faculty/profile", label: "Profile", icon: UserRound },
  ],
  STUDENT: [
    { to: "/student", label: "Home", icon: House, end: true },
    { to: "/student/record", label: "My record", icon: IdCard },
    { to: "/student/assignments", label: "Assignments", icon: FileText },
    { to: "/student/notices", label: "Notices", icon: MessageSquare },
    { to: "/student/events", label: "Events", icon: Calendar },
    { to: "/student/profile", label: "Profile", icon: UserRound },
  ],
};
