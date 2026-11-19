import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../admin/PageHeader";
import Button from "../ui/Button";
import Select from "../ui/Select";
import TimetableGrid from "./TimetableGrid";
import DayWiseList from "./DayWiseList";
import { useTimetableBase } from "./useTimetableBase";

const DAYS = [
  { value: "", label: "All Days" },
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
];

/**
 * Main timetable list view.
 * - Admin: weekly grid with filters and create/edit/delete controls
 * - Faculty: view only their schedule
 * - Student: view only their section's schedule
 */
function TimetableList() {
  const basePath = useTimetableBase();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const dayFilter = params.get("day") ?? "";
  const sectionFilter = params.get("section") ?? "";
  const facultyFilter = params.get("faculty") ?? "";

  const setFilter = (key, fallback = "") => (value) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value && value !== fallback) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );

  // Data state
  const [entries, setEntries] = useState(null);
  const [options, setOptions] = useState({ sections: [], faculties: [] });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"

  const isAdmin = user?.role === "ADMIN";

  // Load sections and faculties for admin filters
  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    Promise.all([
      api.get("/academics/sections/", { params: { page_size: 200 } }),
      api.get("/faculty/", { params: { page_size: 200 } }),
    ])
      .then(([sectRes, facRes]) => {
        if (cancelled) return;
        const sects = Array.isArray(sectRes.data) ? sectRes.data : (sectRes.data.results || []);
        const facs = Array.isArray(facRes.data) ? facRes.data : (facRes.data.results || []);
        setOptions({
          sections: Array.isArray(sects) ? sects : [],
          faculties: Array.isArray(facs) ? facs : [],
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Load timetable entries
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    const params = {};
    if (dayFilter) params.day = dayFilter;
    if (isAdmin) {
      if (sectionFilter) params.section = sectionFilter;
      if (facultyFilter) params.faculty = facultyFilter;
    }

    api
      .get("/timetable/", { params })
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : (res.data.results || res.data);
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dayFilter, sectionFilter, facultyFilter, isAdmin]);

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this timetable entry?")) return;

    try {
      await api.delete(`/timetable/${id}/`);
      toast.success("Timetable entry deleted");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      toast.error("Couldn't delete timetable entry");
    }
  };

  const activeFilters = [dayFilter, sectionFilter, facultyFilter].filter(Boolean).length;

  // Determine page title based on role
  let pageTitle = "Timetable";
  let pageDescription = "Manage class schedules";

  if (!isAdmin) {
    if (user?.role === "FACULTY") {
      pageTitle = "My Schedule";
      pageDescription = "Your assigned classes";
    } else if (user?.role === "STUDENT") {
      pageTitle = "Class Schedule";
      pageDescription = "Your section's timetable";
    }
  }

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          isAdmin && (
            <Button to={`${basePath}/new`}>
              <Plus size={16} aria-hidden="true" /> Add Class
            </Button>
          )
        }
      />

      {/* Admin filters */}
      {isAdmin && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Select
            label="Day"
            value={dayFilter}
            onChange={setFilter("day")}
            placeholder="All days"
            options={DAYS}
            className="w-40"
          />
          <Select
            label="Section"
            value={sectionFilter}
            onChange={setFilter("section")}
            placeholder="All sections"
            options={options.sections.map((s) => ({
              value: String(s.id),
              label: s.name,
            }))}
            className="w-40"
          />
          <Select
            label="Faculty"
            value={facultyFilter}
            onChange={setFilter("faculty")}
            placeholder="All faculty"
            options={options.faculties.map((f) => ({
              value: String(f.id),
              label: `${f.user_details?.first_name} ${f.user_details?.last_name}`,
            }))}
            className="w-48"
          />

          {/* View mode toggle */}
          <div className="ml-auto flex gap-1 rounded-lg border border-line-strong bg-surface p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-surface"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-surface"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              List
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <section aria-busy={loading} className="relative mt-3">
        {loading && (
          <div aria-hidden="true" className="absolute inset-0 z-10 flex items-start justify-center pt-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-[0_2px_8px_rgb(0_0_0/0.08)]">
              <Loader2 size={16} className="animate-spin" /> Loading
            </span>
          </div>
        )}

        <div
          className={`transition-opacity duration-200 ${
            loading ? "pointer-events-none opacity-40 delay-150 select-none" : ""
          }`}
        >
          {failed ? (
            <div role="alert" className="rounded-xl border border-danger bg-danger/10 p-4 text-danger">
              Couldn't load timetable. Check that the backend is running.
            </div>
          ) : entries === null ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-12 text-center">
              <p className="font-medium">No classes scheduled</p>
              {isAdmin && (
                <p className="mt-1 text-sm text-ink-secondary">Create a new class to get started.</p>
              )}
            </div>
          ) : (
            <>
              {/* Show grid view on larger screens if selected, otherwise show list */}
              <div className="hidden md:block">
                {viewMode === "grid" ? (
                  <TimetableGrid
                    entries={entries}
                    isEditable={isAdmin}
                    onEdit={(id) => navigate(`${basePath}/${id}/edit`)}
                    onDelete={handleDelete}
                  />
                ) : (
                  <DayWiseList
                    entries={entries}
                    isEditable={isAdmin}
                    onEdit={(id) => navigate(`${basePath}/${id}/edit`)}
                    onDelete={handleDelete}
                  />
                )}
              </div>

              {/* Show list view on smaller screens */}
              <div className="md:hidden">
                <DayWiseList
                  entries={entries}
                  isEditable={isAdmin}
                  onEdit={(id) => navigate(`${basePath}/${id}/edit`)}
                  onDelete={handleDelete}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default TimetableList;
