import { useState } from "react";
import { Dices, Eye, EyeOff, Loader2 } from "lucide-react";
import Field from "./Field";
import Button from "./ui/Button";
import api from "../services/api";
import { parseApiError } from "../services/errors";

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  password: "",
};

const BUTTON = {
  FACULTY: "Create faculty account",
  STUDENT: "Create student account",
};

// No 0/O/1/l/I so it can be read out or typed from a printed slip
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword(length = 12) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

function CreateUserForm({ role, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Suggest a username from the email until the admin types their own
      if (key === "email" && !usernameEdited) {
        next.username = value.split("@")[0].toLowerCase();
      }
      return next;
    });
    if (key === "username") setUsernameEdited(true);
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const handleGenerate = () => {
    setForm((f) => ({ ...f, password: generatePassword() }));
    setShowPassword(true);
    setErrors((er) => ({ ...er, password: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner("");

    const local = {};
    if (!form.first_name.trim()) local.first_name = "Enter a first name.";
    if (!form.email.trim()) local.email = "Enter an email address.";
    if (!form.username.trim()) local.username = "Enter a username.";
    if (!form.password) local.password = "Enter or generate a password.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/users/", {
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        role,
      });
      onCreated({ ...data, password: form.password });
      setForm(EMPTY);
      setUsernameEdited(false);
      setShowPassword(false);
      setErrors({});
    } catch (err) {
      const { fields, message } = parseApiError(err);
      setErrors(fields);
      // A banner only when no field can carry the message
      setBanner(Object.keys(fields).some((k) => k in EMPTY) ? "" : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {banner && (
        <div
          role="alert"
          className="mb-5 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
        >
          {banner}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="First name"
          value={form.first_name}
          onChange={set("first_name")}
          error={errors.first_name}
          autoComplete="off"
        />
        <Field
          label="Last name"
          value={form.last_name}
          onChange={set("last_name")}
          error={errors.last_name}
          autoComplete="off"
        />
        <Field
          className="sm:col-span-2"
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
          hint="Password reset links are sent here."
          autoComplete="off"
        />
        <Field
          label="Username"
          value={form.username}
          onChange={set("username")}
          error={errors.username}
          hint="Used to sign in. Filled from the email."
          autoComplete="off"
        />
        <div>
          <Field
            label="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            autoComplete="new-password"
            action={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-secondary hover:bg-surface-secondary hover:text-ink"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <Dices size={16} aria-hidden="true" /> Generate one
          </button>
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="mt-8">
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Creating
          </>
        ) : (
          BUTTON[role]
        )}
      </Button>
    </form>
  );
}

export default CreateUserForm;
