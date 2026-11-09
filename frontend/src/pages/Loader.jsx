import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import "./Loader.css";

const DURATION = 2200; // ms until progress hits 100%
const EXIT = 700; // ms for the exit animation

const STATUS = [
  "Preparing your campus",
  "Syncing timetables",
  "Loading notices",
  "Almost there",
];

function Loader({ onLeave, onDone }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / DURATION, 1);
      // ease-out so it feels like it settles
      setProgress(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setLeaving(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    onLeave();
    const id = setTimeout(onDone, EXIT);
    return () => clearTimeout(id);
  }, [leaving, onLeave, onDone]);

  const status = STATUS[Math.min(Math.floor(progress / 26), STATUS.length - 1)];

  return (
    <div
      className={`loader fixed inset-0 z-50 flex flex-col items-center justify-center bg-night text-white ${
        leaving ? "loader-leave" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${progress}%`}
    >
      <div className="loader-glow pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-primary/30 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <span className="loader-logo flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <GraduationCap size={32} />
        </span>
        <h1 className="loader-title mt-5 text-2xl font-bold tracking-tight">
          Smart Campus
        </h1>
        <p className="loader-title mt-1 text-sm text-white/60">
          Management System
        </p>

        <div className="mt-10 h-1.5 w-64 overflow-hidden rounded-full bg-night-light">
          <div
            className="h-full w-full origin-left rounded-full bg-primary"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>

        <div className="mt-4 flex w-64 items-center justify-between text-sm">
          <span className="text-white/60">{status}</span>
          <span className="font-semibold tabular-nums">{progress}%</span>
        </div>
      </div>
    </div>
  );
}

export default Loader;
