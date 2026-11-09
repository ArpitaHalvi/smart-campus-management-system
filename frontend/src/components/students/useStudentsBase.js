import { useAuth } from "../../context/AuthContext";

/** Students pages are shared; each role reaches them under its own prefix. */
export function useStudentsBase() {
  const { user } = useAuth();
  return user.role === "ADMIN" ? "/admin/students" : "/faculty/students";
}
