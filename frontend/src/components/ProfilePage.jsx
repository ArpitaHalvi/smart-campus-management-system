import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../services/api";
import { parseApiError } from "../services/errors";
import { useAuth } from "../context/AuthContext";
import Field from "./Field";
import Button from "./ui/Button";
import PageHeader from "./admin/PageHeader";
import { ROLE_LABEL, STATUS_LABEL } from "./admin/labels";

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className="mt-0.5 text-[0.9375rem] font-medium">{children}</dd>
    </div>
  );
}

function EyeToggle({ shown, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-secondary hover:bg-surface-secondary hover:text-ink"
    >
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

/** Name and email: the only details a user may change about themselves. */
function DetailsForm({ profile, onSaved }) {
  const [form, setForm] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);

  const dirty = Object.keys(form).some((k) => form[k] !== profile[k]);
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
    if (!form.first_name.trim()) {
      setErrors({ first_name: "Enter your first name." });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/me/", {
        ...form,
        email: form.email.trim(),
      });
      onSaved(data);
      setErrors({});
      toast.success("Profile updated");
    } catch (err) {
      const { fields, message } = parseApiError(err);
      setErrors(fields);
      setBanner(Object.keys(fields).some((k) => k in form) ? "" : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {banner && (
        <div role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {banner}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" value={form.first_name} onChange={set("first_name")} error={errors.first_name} autoComplete="given-name" />
        <Field label="Last name" value={form.last_name} onChange={set("last_name")} error={errors.last_name} autoComplete="family-name" />
        <Field
          className="sm:col-span-2"
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
          hint="Password reset links are sent here."
          autoComplete="email"
        />
      </div>
      <Button type="submit" className="mt-5" disabled={!dirty || saving}>
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Saving
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const empty = { current_password: "", new_password: "", confirm: "" };
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
    if (form.new_password !== form.confirm) {
      setErrors({ confirm: "The two passwords don't match." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/me/password/", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setForm(empty);
      setErrors({});
      toast.success("Password changed");
    } catch (err) {
      const { fields, message } = parseApiError(err);
      setErrors(fields);
      setBanner(
        ["current_password", "new_password"].some((k) => fields[k]) ? "" : message,
      );
    } finally {
      setSaving(false);
    }
  };

  const eye = <EyeToggle shown={show} onToggle={() => setShow((s) => !s)} label="passwords" />;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {banner && (
        <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {banner}
        </div>
      )}
      <Field
        label="Current password"
        type={show ? "text" : "password"}
        value={form.current_password}
        onChange={set("current_password")}
        error={errors.current_password}
        autoComplete="current-password"
        action={eye}
      />
      <Field
        label="New password"
        type={show ? "text" : "password"}
        value={form.new_password}
        onChange={set("new_password")}
        error={errors.new_password}
        hint="At least 8 characters, and not a common password."
        autoComplete="new-password"
      />
      <Field
        label="Confirm new password"
        type={show ? "text" : "password"}
        value={form.confirm}
        onChange={set("confirm")}
        error={errors.confirm}
        autoComplete="new-password"
      />
      <Button
        type="submit"
        disabled={saving || !form.current_password || !form.new_password || !form.confirm}
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Changing
          </>
        ) : (
          "Change password"
        )}
      </Button>
    </form>
  );
}

function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [failed, setFailed] = useState(false);

  // Always show the server's copy, not whatever was saved at sign-in
  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/me/")
      .then((res) => !cancelled && setProfile(res.data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const saved = (data) => {
    setProfile(data);
    updateUser(data);
  };

  return (
    <>
      <PageHeader title="Profile" description="Your details and sign-in security." />

      {failed && (
        <p role="alert" className="mt-5 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          Couldn't load your profile. Check that the backend is running.
        </p>
      )}

      {!profile && !failed && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2" aria-busy="true">
          <div className="skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
      )}

      {profile && (
        <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
          <section aria-labelledby="details-h" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="details-h" className="font-semibold">Your details</h2>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <Detail label="Username">{profile.username}</Detail>
              <Detail label="Role">{ROLE_LABEL[profile.role]}</Detail>
              <Detail label="Account">
                <span className={profile.status === "ACTIVE" ? "" : "text-warning"}>
                  {STATUS_LABEL[profile.status]}
                </span>
              </Detail>
              <Detail label="Member since">
                {format(new Date(profile.date_joined), "d MMM yyyy")}
              </Detail>
              <Detail label="Last sign-in">
                {profile.last_login
                  ? format(new Date(profile.last_login), "d MMM yyyy, h:mm a")
                  : "This session"}
              </Detail>
            </dl>

            <div className="mt-6 border-t border-line pt-5">
              <h3 className="mb-4 font-medium">Edit</h3>
              <DetailsForm key={profile.email + profile.first_name + profile.last_name} profile={profile} onSaved={saved} />
              <p className="mt-4 text-sm text-ink-muted">
                Your username and role are set by an administrator.
              </p>
            </div>
          </section>

          <section aria-labelledby="password-h" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="password-h" className="font-semibold">Password</h2>
            <p className="mt-1 mb-4 text-sm text-ink-secondary">
              Use a password you don't use anywhere else.
            </p>
            <PasswordForm />
          </section>
        </div>
      )}
    </>
  );
}

export default ProfilePage;
