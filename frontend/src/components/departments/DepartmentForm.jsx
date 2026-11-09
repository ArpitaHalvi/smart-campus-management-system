import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { parseApiError } from "../../services/errors";
import Field from "../Field";
import Button from "../ui/Button";
import Select from "../ui/Select";

const EMPTY = { name: "", code: "", head: "", description: "" };

/** Admin: add a department (no id in the URL) or edit one (`:id`). */
function DepartmentForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [original, setOriginal] = useState(null);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const requests = [api.get("/academics/faculty-options/")];
    if (editing) requests.push(api.get(`/academics/departments/${id}/`));
    Promise.all(requests)
      .then(([f, d]) => {
        if (cancelled) return;
        setFaculty(f.data);
        if (d) {
          setOriginal(d.data);
          setForm({
            name: d.data.name,
            code: d.data.code,
            head: d.data.head ? String(d.data.head) : "",
            description: d.data.description,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.response?.status === 404 ? "That department doesn't exist." : "Couldn't load this page. Check that the backend is running.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, editing]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
    if (!form.name.trim()) {
      setErrors({ name: "Enter a department name." });
      return;
    }
    const payload = {
      name: form.name,
      code: form.code,
      description: form.description,
      head: form.head ? Number(form.head) : null,
    };
    setSaving(true);
    try {
      if (editing) await api.patch(`/academics/departments/${id}/`, payload);
      else await api.post("/academics/departments/", payload);
      toast.success(editing ? "Department updated" : "Department added");
      navigate("/admin/departments");
    } catch (err) {
      const { fields, message } = parseApiError(err);
      setErrors(fields);
      setBanner(Object.keys(fields).some((k) => k in EMPTY) ? "" : message);
      setSaving(false);
    }
  };

  return (
    <>
      <Link
        to="/admin/departments"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Departments
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {editing ? (original ? `Edit ${original.name}` : "Edit department") : "Add a department"}
        </h1>
        <p className="mt-1 text-ink-secondary">
          {editing ? "Update this department's details." : "Create a department students can be placed in."}
        </p>
      </header>

      {loadError && (
        <p role="alert" className="mt-5 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{loadError}</p>
      )}

      {loading && !loadError && (
        <div className="mt-5 skeleton h-72 max-w-2xl rounded-xl" aria-busy="true" />
      )}

      {!loading && !loadError && (
        <form onSubmit={submit} noValidate className="mt-5 max-w-2xl rounded-xl border border-line bg-surface p-5">
          {banner && (
            <div role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{banner}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Field
              label="Name"
              value={form.name}
              onChange={set("name")}
              error={errors.name}
              placeholder="e.g. Computer Science"
              autoComplete="off"
              autoFocus={!editing}
            />
            <Field
              label="Code"
              value={form.code}
              onChange={set("code")}
              error={errors.code}
              placeholder="e.g. CSE"
              maxLength={10}
              optional
              autoComplete="off"
            />
          </div>

          <div className="mt-4">
            <span className="mb-1.5 block text-sm font-medium">
              Head of department <span className="font-normal text-ink-muted">(optional)</span>
            </span>
            <Select
              label="Head of department"
              value={form.head}
              onChange={(v) => {
                setForm((f) => ({ ...f, head: v }));
                if (errors.head) setErrors((er) => ({ ...er, head: undefined }));
              }}
              placeholder="No head assigned"
              options={faculty.map((f) => ({ value: String(f.id), label: f.name }))}
              className="max-w-sm"
            />
            {errors.head && <p role="alert" className="mt-1.5 text-sm text-danger">{errors.head}</p>}
          </div>

          <Field
            className="mt-4"
            label="Description"
            multiline
            value={form.description}
            onChange={set("description")}
            error={errors.description}
            optional
          />

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? (
                <><Loader2 size={18} className="animate-spin" /> Saving</>
              ) : editing ? (
                "Save changes"
              ) : (
                "Add department"
              )}
            </Button>
            <Button variant="ghost" size="lg" to="/admin/departments">Cancel</Button>
          </div>
        </form>
      )}
    </>
  );
}

export default DepartmentForm;
