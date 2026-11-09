import AppShell from "../AppShell";
import { NAV } from "../navigation";

function AdminLayout() {
  return <AppShell links={NAV.ADMIN} label="Admin" />;
}

export default AdminLayout;
