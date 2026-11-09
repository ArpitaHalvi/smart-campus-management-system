import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Search, Upload, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useSearchInput } from "../../hooks/useSearchInput";
import PageHeader from "../admin/PageHeader";
import { fullName } from "../admin/labels";
import Button from "../ui/Button";
import Segmented from "../ui/Segmented";
import Select from "../ui/Select";
import EnrollPanel from "./EnrollPanel";
import { useStudentsBase } from "./useStudentsBase";

const PAGE_SIZE = 10;

const RECORDS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const range = (n, prefix) =>
  Array.from({ length: n }, (_, i) => ({ value: String(i + 1), label: `${prefix} ${i + 1}` }));
const YEARS = range(6, "Year");
const SEMESTERS = range(8, "Semester");

/** "Year 2 · Sem 3 · Sec A", skipping whatever isn't set. */
const classOf = (s) =>
  [s.year_of_study && `Year ${s.year_of_study}`, s.semester_number && `Sem ${s.semester_number}`, s.section_name && `Sec ${s.section_name}`]
    .filter(Boolean)
    .join(" · ");

function StudentsList() {
  const base = useStudentsBase();
  const [params, setParams] = useSearchParams();
  const record = params.get("record") ?? "active";
  const department = params.get("department") ?? "";
  const course = params.get("course") ?? "";
  const year = params.get("year") ?? "";
  const semester = params.get("semester") ?? "";
  const section = params.get("section") ?? "";

  const setFilter = (key, fallback = "") => (value) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value && value !== fallback) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const activeFilters = [department, course, year, semester, section].filter(Boolean).length;
  const clearFilters = () =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        ["department", "course", "year", "semester", "section"].forEach((k) => next.delete(k));
        return next;
      },
      { replace: true },
    );

  // Departments, courses and section names that exist, for the dropdowns
  const [options, setOptions] = useState({ departments: [], courses: [], sections: [] });
  useEffect(() => {
    let cancelled = false;
    api
      .get("/students/filter-options/")
      .then((res) => !cancelled && setOptions(res.data))
      .catch(() => {}); // the dropdowns just stay empty
    return () => {
      cancelled = true;
    };
  }, []);

  // Searches only once typing has paused (or on Enter), not on every keystroke
  const search = useSearchInput();

  // The page belongs to the filters it was chosen under; new filters mean page 1
  const filterKey = [search.query, record, department, course, year, semester, section].join("|");
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const goTo = (n) => setPageState({ key: filterKey, page: n });

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  // Rows on screen belong to `loadedKey`; a different request key means a fetch is in flight
  const requestKey = `${page}|${filterKey}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const loading = !failed && data !== null && loadedKey !== requestKey;
  const [refreshKey, setRefreshKey] = useState(0);

  // Selecting students to enroll. Only offered in the Active view, so "select
  // everyone matching" can never include archived records. A selection belongs
  // to the filters it was made under and clears when they change.
  const canSelect = record === "active";
  const [selState, setSelState] = useState({ key: "", ids: new Set(), all: false });
  const sel = selState.key === filterKey ? selState : { key: filterKey, ids: new Set(), all: false };
  const [enrolling, setEnrolling] = useState(false);

  const pageIds = data ? data.results.map((s) => s.id) : [];
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => sel.ids.has(id));
  const selectedCount = data ? (sel.all ? data.count : sel.ids.size) : 0;

  const toggleRow = (id) => {
    const ids = new Set(sel.ids);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    setSelState({ key: filterKey, ids, all: false });
  };
  const togglePage = () => {
    const ids = new Set(sel.ids);
    pageIds.forEach((id) => (allOnPage ? ids.delete(id) : ids.add(id)));
    setSelState({ key: filterKey, ids, all: false });
  };
  const clearSelection = () => {
    setSelState({ key: filterKey, ids: new Set(), all: false });
    setEnrolling(false);
  };

  // What the enroll call applies to: the ticked students, or everyone matching the filters
  const scope = sel.all
    ? {
        filters: Object.fromEntries(
          Object.entries({ search: search.query, department, course, year, semester, section }).filter(([, v]) => v),
        ),
      }
    : { student_ids: [...sel.ids] };

  useEffect(() => {
    let cancelled = false;
    api
      .get("/students/", {
        params: {
          page,
          record,
          search: search.query || undefined,
          department: department || undefined,
          course: course || undefined,
          year: year || undefined,
          semester: semester || undefined,
          section: section || undefined,
        },
      })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setLoadedKey(requestKey);
        setFailed(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404 && page > 1) setPageState({ key: filterKey, page: 1 });
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search.query, record, department, course, year, semester, section, filterKey, requestKey, refreshKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const from = data?.count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = data ? Math.min(page * PAGE_SIZE, data.count) : 0;
  const filtered = Boolean(search.query || activeFilters || record !== "active");

  return (
    <>
      <PageHeader
        title="Students"
        description="Everyone registered as a student."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button to={`${base}/new`}>
              <UserPlus size={16} aria-hidden="true" /> Register student
            </Button>
            <Button to={`${base}/import`} variant="secondary">
              <Upload size={16} aria-hidden="true" /> Import CSV
            </Button>
          </div>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1 sm:max-w-sm">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.update(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search.flush()}
            placeholder="Search name, student ID or email"
            aria-label="Search students"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
        <Segmented label="Record" options={RECORDS} value={record} onChange={setFilter("record", "active")} />
        {loading && (
          <span role="status" className="delayed-in inline-flex items-center gap-2 text-sm text-ink-secondary">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading…
          </span>
        )}
        {!loading && search.pending && (
          <span className="text-sm text-ink-muted">Searches when you stop typing, or press Enter</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Select
          label="Department"
          value={department}
          onChange={setFilter("department")}
          placeholder="All departments"
          options={options.departments.map((d) => ({ value: String(d.id), label: d.name }))}
          className="w-52"
        />
        <Select
          label="Course"
          value={course}
          onChange={setFilter("course")}
          placeholder="All courses"
          options={options.courses.map((c) => ({ value: String(c.id), label: c.name }))}
          className="w-52"
        />
        <Select label="Year" value={year} onChange={setFilter("year")} placeholder="Any year" options={YEARS} className="w-36" />
        <Select label="Semester" value={semester} onChange={setFilter("semester")} placeholder="Any semester" options={SEMESTERS} className="w-40" />
        <Select
          label="Section"
          value={section}
          onChange={setFilter("section")}
          placeholder="Any section"
          options={options.sections.map((s) => ({ value: s, label: `Section ${s}` }))}
          className="w-40"
        />
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="cursor-pointer rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Clear filters ({activeFilters})
          </button>
        )}
      </div>

      {canSelect && selectedCount > 0 && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5">
            <p className="text-sm font-medium">
              {sel.all ? `All ${data.count} matching students selected` : `${selectedCount} selected`}
            </p>
            {!sel.all && allOnPage && data.count > pageIds.length && (
              <button
                type="button"
                onClick={() => setSelState({ key: filterKey, ids: new Set(sel.ids), all: true })}
                className="cursor-pointer rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Select all {data.count} matching
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {!enrolling && (
                <Button onClick={() => setEnrolling(true)}>
                  <Users size={16} aria-hidden="true" /> Enroll…
                </Button>
              )}
              <Button variant="ghost" onClick={clearSelection}>Clear</Button>
            </div>
          </div>
          {enrolling && (
            <EnrollPanel
              count={selectedCount}
              scope={scope}
              options={options}
              onCancel={() => setEnrolling(false)}
              onApplied={({ updated }) => {
                toast.success(`${updated} student${updated === 1 ? "" : "s"} updated`);
                clearSelection();
                setRefreshKey((k) => k + 1);
              }}
            />
          )}
        </div>
      )}

      <section aria-busy={loading} className="relative mt-3 overflow-hidden rounded-xl border border-line bg-surface">
        {loading && (
          <div aria-hidden="true" className="delayed-in absolute inset-0 z-10 flex items-start justify-center pt-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-[0_2px_8px_rgb(0_0_0/0.08)]">
              <Loader2 size={16} className="animate-spin" /> Loading
            </span>
          </div>
        )}
        <div className={`transition-opacity duration-200 ${loading ? "pointer-events-none opacity-40 delay-150 select-none" : ""}`}>
          {failed ? (
            <p role="alert" className="p-5 text-danger">Couldn't load students. Check that the backend is running.</p>
          ) : data === null ? (
            <div className="space-y-px p-3" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-14 rounded-md" />
              ))}
            </div>
          ) : data.results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">{filtered ? "No students match that" : "No students registered yet"}</p>
              <p className="mt-1 text-ink-secondary">
                {filtered ? "Try a different search or clear a filter." : "Register your first student to get started."}
              </p>
            </div>
          ) : (
            <>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line text-sm text-ink-secondary">
                    {canSelect && (
                      <th scope="col" className="h-10 w-10 pl-4">
                        <input
                          type="checkbox"
                          checked={allOnPage}
                          onChange={togglePage}
                          aria-label="Select all students on this page"
                          className="h-4 w-4 cursor-pointer"
                        />
                      </th>
                    )}
                    <th scope="col" className="h-10 w-2/5 px-4 font-medium">Student</th>
                    <th scope="col" className="hidden h-10 px-3 font-medium sm:table-cell">Student ID</th>
                    <th scope="col" className="hidden h-10 px-3 font-medium md:table-cell">Department</th>
                    <th scope="col" className="hidden h-10 px-3 font-medium lg:table-cell">Class</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((s) => (
                    <tr key={s.id} className={`border-b border-line last:border-b-0 hover:bg-background ${sel.all || sel.ids.has(s.id) ? "bg-primary/5" : ""}`}>
                      {canSelect && (
                        <td className="w-10 pl-4">
                          <input
                            type="checkbox"
                            checked={sel.all || sel.ids.has(s.id)}
                            disabled={sel.all}
                            onChange={() => toggleRow(s.id)}
                            aria-label={`Select ${fullName(s)}`}
                            className="h-4 w-4 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="max-w-0 px-4 py-2.5">
                        <Link to={`${base}/${s.id}`} className="block rounded-sm focus-visible:outline-offset-4">
                          <p className="truncate text-[0.9375rem] font-medium">
                            {fullName(s)}
                            {s.record_status === "ARCHIVED" && (
                              <span className="ml-2 text-sm font-normal text-warning">Archived</span>
                            )}
                          </p>
                          <p className="truncate text-sm text-ink-secondary">{s.email}</p>
                        </Link>
                      </td>
                      <td className="tnum hidden px-3 text-[0.9375rem] sm:table-cell">{s.enrollment_number}</td>
                      <td className="hidden px-3 text-[0.9375rem] md:table-cell">
                        {s.department_name || <span className="text-ink-muted">—</span>}
                        {s.course_name && <span className="block max-w-[14rem] truncate text-sm text-ink-secondary">{s.course_name}</span>}
                      </td>
                      <td className="hidden px-3 text-[0.9375rem] whitespace-nowrap lg:table-cell">
                        {classOf(s) || <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Link
                          to={`${base}/${s.id}`}
                          aria-label={`View ${fullName(s)}`}
                          className="inline-flex h-8 items-center rounded-md border border-line-strong px-3 text-sm font-medium text-ink-secondary hover:bg-surface-secondary hover:text-ink"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="tnum text-sm text-ink-secondary">{from}–{to} of {data.count}</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line-strong hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages} aria-label="Next page"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line-strong hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default StudentsList;
