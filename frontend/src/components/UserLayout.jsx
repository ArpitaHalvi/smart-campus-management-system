import AppShell from "./AppShell";
import { NAV } from "./navigation";
import { useAuth } from "../context/AuthContext";

/** Faculty and students get the same sidebar shell as admins, with their own menu. */
function UserLayout() {
  const { user } = useAuth();
  return <AppShell links={NAV[user.role] ?? []} label={user.role === "FACULTY" ? "Faculty" : "Student"} />;
}

export default UserLayout;
