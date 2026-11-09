import { NavLink, Outlet } from "react-router-dom";
import PageHeader from "../admin/PageHeader";
import { useIsAdmin } from "./hooks";

const TABS = [
  { to: "years", label: "Academic years" },
  { to: "semesters", label: "Semesters" },
  { to: "courses", label: "Courses" },
  { to: "sections", label: "Sections" },
];

/** The Academics area: four tabs over one shared header. */
function AcademicsPage() {
  const isAdmin = useIsAdmin();

  return (
    <>
      <PageHeader
        title="Academics"
        description={
          isAdmin
            ? "Academic years, semesters, courses and sections."
            : "Academic years, semesters, courses and sections (view only)."
        }
      />

      <nav aria-label="Academics" className="mt-5 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `-mb-px shrink-0 border-b-2 px-3 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-primary text-ink"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}

export default AcademicsPage;
