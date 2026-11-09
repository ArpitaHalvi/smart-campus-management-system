import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Field from "../components/Field";
import Button from "../components/ui/Button";
import api from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/password/forgot/", { email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Too many requests. Please wait a while and try again.");
      } else if (err.response?.status === 400) {
        setError("Enter a valid email address.");
      } else {
        setError("Couldn't send the request. Check your connection.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      panelTitle="Locked out? It happens."
      panelText="Tell us your email and we'll send a link to choose a new password."
      footnote="The link works once and expires after one hour."
    >
      {sentTo ? (
        <div>
          <MailCheck size={28} className="text-primary" aria-hidden="true" />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.025em]">
            Check your email
          </h1>
          <p className="mt-3 leading-relaxed text-ink-secondary">
            If an account exists for{" "}
            <span className="font-medium text-ink">{sentTo}</span>, a reset
            link is on its way. It can take a minute to arrive.
          </p>
          <button
            type="button"
            onClick={() => setSentTo("")}
            className="mt-6 cursor-pointer rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-[-0.025em]">
            Forgot password
          </h1>
          <p className="mt-2 text-ink-secondary">
            Enter the email your administrator registered for you.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
              >
                {error}
              </div>
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || !email}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Sending
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        </>
      )}

      <Link
        to="/login"
        className="mt-8 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to sign in
      </Link>
    </AuthShell>
  );
}

export default ForgotPassword;
