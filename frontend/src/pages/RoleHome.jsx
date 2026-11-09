import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/admin/PageHeader";

/** Temporary home for roles whose dashboard isn't built yet. */
function RoleHome() {
  const { user } = useAuth();

  return (
    <PageHeader
      title={`Welcome, ${user.first_name || user.username}`}
      description="Register students and keep their records up to date from Students. Your own details are under Profile."
    />
  );
}

export default RoleHome;
