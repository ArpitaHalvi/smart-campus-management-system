import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import Button from "../ui/Button";
import LinkSelect from "../students/LinkSelect";
import { useTimetableBase } from "./useTimetableBase";

const DAYS = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
];

/**
 * Admin-only form for creating/editing timetable entries.
 * Supports section, subject, faculty, day, start/end time, and room.
 */
function TimetableForm() {
  const basePath = useTimetableBase();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  // Form state
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [faculty, setFaculty] = useState("");
  const [day, setDay] = useState("MONDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");

  // Options
  const [options, setOptions] = useState({
    sections: [],
    subjects: [],
    faculties: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Loading and errors
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load options and existing entry (if editing)
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get("/academics/sections/", { params: { page_size: 200 } }),
      api.get("/subjects/", { params: { page_size: 200 } }),
      api.get("/faculty/", { params: { page_size: 200 } }),
      isEdit ? api.get(`/timetable/${id}/`) : Promise.resolve(null),
    ])
      .then(([sectRes, subjRes, facRes, existingRes]) => {
        if (cancelled) return;

        const sects = Array.isArray(sectRes.data) ? sectRes.data : (sectRes.data.results || []);
        const subjs = Array.isArray(subjRes.data) ? subjRes.data : (subjRes.data.results || []);
        const facs = Array.isArray(facRes.data) ? facRes.data : (facRes.data.results || []);

        setOptions({
          sections: Array.isArray(sects) ? sects : [],
          subjects: Array.isArray(subjs) ? subjs : [],
          faculties: Array.isArray(facs) ? facs : [],
        });

        // Populate form if editing
        if (isEdit && existingRes?.data) {
          const entry = existingRes.data;
          setSection(String(entry.section));
          setSubject(String(entry.subject));
          setFaculty(String(entry.faculty));
          setDay(entry.day);
          setStartTime(entry.start_time);
          setEndTime(entry.end_time);
          setRoom(entry.room);
        }

        setLoadingOptions(false);
      })
      .catch(() => {
        toast.error("Couldn't load form options");
        setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const payload = {
      section: Number(section),
      subject: Number(subject),
      faculty: Number(faculty),
      day,
      start_time: startTime,
      end_time: endTime,
      room,
    };

    try {
      if (isEdit) {
        await api.patch(`/timetable/${id}/`, payload);
        toast.success("Timetable entry updated successfully");
      } else {
        await api.post("/timetable/", payload);
        toast.success("Timetable entry created successfully");
      }
      navigate(basePath);
    } catch (err) {
      const errorData = err.response?.data || {};

      // Handle backend validation errors
      if (typeof errorData === "object") {
        setErrors(errorData);
        // Show first error as toast
        const firstError = Object.values(errorData)[0];
        if (firstError) {
          const errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
          toast.error(errorMsg);
        }
      } else {
        toast.error("Couldn't save timetable entry");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
        <p>Loading form...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(basePath)}
          className="inline-flex h-8 items-center justify-center rounded-md border border-line-strong text-ink-secondary hover:bg-surface-secondary"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-2xl font-semibold">
          {isEdit ? "Edit Timetable Entry" : "Create Timetable Entry"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <h2 className="text-lg font-semibold">Class Details</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <LinkSelect
                label="Section"
                value={section}
                onChange={setSection}
                placeholder="Select section"
                options={options.sections.map((s) => ({
                  value: String(s.id),
                  label: `${s.name}`,
                }))}
                optional={false}
                error={errors.section}
              />
            </div>

            <div>
              <LinkSelect
                label="Subject"
                value={subject}
                onChange={setSubject}
                placeholder="Select subject"
                options={options.subjects.map((s) => ({
                  value: String(s.id),
                  label: `${s.name} (${s.code})`,
                }))}
                optional={false}
                error={errors.subject}
              />
            </div>

            <div>
              <LinkSelect
                label="Faculty"
                value={faculty}
                onChange={setFaculty}
                placeholder="Select faculty"
                options={options.faculties.map((f) => ({
                  value: String(f.id),
                  label: `${f.user_details?.first_name} ${f.user_details?.last_name}`,
                }))}
                optional={false}
                error={errors.faculty}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Day</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] cursor-pointer hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              {errors.day && <p className="mt-1 text-xs text-danger">{errors.day}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              {errors.start_time && <p className="mt-1 text-xs text-danger">{errors.start_time}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              {errors.end_time && <p className="mt-1 text-xs text-danger">{errors.end_time}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Room Number</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g., A101, Lab-2"
                className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              {errors.room && <p className="mt-1 text-xs text-danger">{errors.room}</p>}
            </div>
          </div>

          {/* Generic validation errors */}
          {errors.non_field_errors && (
            <div role="alert" className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-danger text-sm">
              {Array.isArray(errors.non_field_errors)
                ? errors.non_field_errors.join(", ")
                : errors.non_field_errors}
            </div>
          )}
        </section>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving
              </>
            ) : (
              <>
                <Save size={16} aria-hidden="true" /> {isEdit ? "Update" : "Create"}
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => navigate(basePath)} disabled={loading}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default TimetableForm;
