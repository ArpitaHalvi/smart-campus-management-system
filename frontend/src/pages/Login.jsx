import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/Field";
import Button from "../components/ui/Button";
import { HOME_BY_ROLE, useAuth } from "../context/AuthContext";
import { parseApiError } from "../services/errors";

function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to={HOME_BY_ROLE[user.role] ?? "/"} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const loggedIn = await login(form.username.trim(), form.password);
      navigate(HOME_BY_ROLE[loggedIn.role] ?? "/", { replace: true });
    } catch (err) {
      setError(parseApiError(err).message);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      panelTitle="Everything your campus runs on, in one place."
      panelText="Sign in with the account your administrator created for you."
      footnote="Need an account? Contact your administrator."
    >
      <h1 className="text-3xl font-semibold tracking-[-0.025em]">Sign in</h1>
      <p className="mt-2 text-ink-secondary">
        Enter your username and password to continue.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {location.state?.passwordReset && !error && (
          <div
            role="status"
            className="rounded-lg bg-success/12 px-4 py-3 text-sm text-ink"
          >
            Password updated. Sign in with your new password.
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </div>
        )}

        <Field
          label="Username"
          value={form.username}
          onChange={set("username")}
          autoComplete="username"
          autoFocus
          required
        />

        <div>
          <Field
            label="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            autoComplete="current-password"
            required
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
          <Link
            to="/forgot-password"
            className="mt-2 inline-block rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || !form.username || !form.password}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Signing in
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

export default Login;
