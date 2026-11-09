import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Link2Off, Loader2 } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/Field";
import Button from "../components/ui/Button";
import api from "../services/api";
import { parseApiError } from "../services/errors";

function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";

  // "checking" -> "valid" | "invalid": the link is verified before showing the form
  const [status, setStatus] = useState(uid && token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uid || !token) return;
    let cancelled = false;
    api
      .post("/auth/password/verify/", { uid, token })
      .then(() => !cancelled && setStatus("valid"))
      .catch(() => !cancelled && setStatus("invalid"));
    return () => {
      cancelled = true;
    };
  }, [uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner("");

    if (password !== confirm) {
      setErrors({ confirm: "The two passwords don't match." });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await api.post("/auth/password/reset/", {
        uid,
        token,
        new_password: password,
      });
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (err) {
      const { fields, message } = parseApiError(err);
      if (fields.token) {
        setStatus("invalid"); // link expired or was already used
      } else {
        setErrors({ password: fields.new_password });
        setBanner(fields.new_password ? "" : message);
      }
      setSubmitting(false);
    }
  };

  const eye = (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      aria-label={show ? "Hide passwords" : "Show passwords"}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-secondary hover:bg-surface-secondary hover:text-ink"
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <AuthShell
      panelTitle="Choose a new password."
      panelText="Pick something you haven't used elsewhere. You'll sign in with it straight after."
      footnote="Reset links work once and expire after one hour."
    >
      {status === "checking" && (
        <div className="space-y-4" aria-busy="true" aria-label="Checking link">
          <div className="skeleton h-9 w-2/3 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
        </div>
      )}

      {status === "invalid" && (
        <div>
          <Link2Off size={28} className="text-warning" aria-hidden="true" />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.025em]">
            This link has expired
          </h1>
          <p className="mt-3 leading-relaxed text-ink-secondary">
            Reset links work once and last one hour. Request a new one and
            we'll email it straight away.
          </p>
          <Button to="/forgot-password" size="lg" className="mt-7">
            Request a new link
          </Button>
        </div>
      )}

      {status === "valid" && (
        <>
          <h1 className="text-3xl font-semibold tracking-[-0.025em]">
            New password
          </h1>
          <p className="mt-2 text-ink-secondary">
            At least 8 characters, and not a common password.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {banner && (
              <div
                role="alert"
                className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
              >
                {banner}
              </div>
            )}
            <Field
              label="New password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="new-password"
              autoFocus
              required
              action={eye}
            />
            <Field
              label="Confirm password"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
              autoComplete="new-password"
              required
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || !password || !confirm}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Updating
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default ResetPassword;
