import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "./Logo";

/** Split layout shared by sign in, forgot password and reset password. */
function AuthShell({ panelTitle, panelText, footnote, children }) {
  return (
    <main className="grid min-h-screen bg-background text-ink lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="hidden flex-col justify-between bg-night p-12 text-white lg:flex">
        <Link
          to="/"
          className="w-fit rounded-md focus-visible:outline-white"
          aria-label="Smart Campus home"
        >
          <Logo light />
        </Link>

        <div className="max-w-md">
          <h2 className="text-[2.5rem] leading-[1.1] font-semibold tracking-[-0.025em] text-balance">
            {panelTitle}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/70">
            {panelText}
          </p>
        </div>

        <p className="max-w-sm text-sm text-white/55">{footnote}</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink lg:hidden"
          >
            <ArrowLeft size={16} /> Smart Campus
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}

export default AuthShell;
