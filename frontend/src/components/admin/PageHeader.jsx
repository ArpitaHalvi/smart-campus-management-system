import { UserPlus } from "lucide-react";
import Button from "../ui/Button";

/** The two ways to add someone. Both open the same page with the role chosen. */
export function AddButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button to="/admin/users/new">
        <UserPlus size={16} aria-hidden="true" /> Add faculty
      </Button>
      <Button to="/admin/students/new" variant="secondary">
        <UserPlus size={16} aria-hidden="true" /> Add student
      </Button>
    </div>
  );
}

function PageHeader({ title, description, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        {description && (
          <p className="mt-1 text-ink-secondary">{description}</p>
        )}
      </div>
      {actions}
    </header>
  );
}

export default PageHeader;
