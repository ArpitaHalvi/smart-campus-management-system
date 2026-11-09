import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, GraduationCap } from "lucide-react";
import "./Intro.css";

// Sample timetable for the animated preview
const PERIODS = [
  { time: "09:00", subject: "Data Structures", place: "Room 204" },
  { time: "10:00", subject: "Engineering Maths", place: "Hall B" },
  { time: "11:30", subject: "Physics Lab", place: "Lab 3" },
  { time: "13:30", subject: "Database Systems", place: "Room 108" },
  { time: "15:00", subject: "Mentoring Hour", place: "Block C" },
];

const ROW_H = 68; // px, keeps the moving marker aligned with rows

function Intro() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);

  // Step "now" through the day once the intro has played
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;
    const start = setTimeout(() => {
      const id = setInterval(
        () => setActive((a) => (a + 1) % PERIODS.length),
        2200,
      );
      cleanup = () => clearInterval(id);
    }, 1400);
    let cleanup = () => {};
    return () => {
      clearTimeout(start);
      cleanup();
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-ink">
      {/* Soft background glow */}
      <div
        className="drift pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary-light/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 py-10 sm:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Left: message */}
        <section>
          <div
            className="rise mb-10 flex items-center gap-3"
            style={{ "--d": 0 }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <GraduationCap size={22} />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Smart Campus
            </span>
          </div>

          <h1
            className="rise text-5xl leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-6xl lg:text-7xl"
            style={{ "--d": 120 }}
          >
            Your whole campus, in sync.
          </h1>

          <p
            className="rise mt-6 max-w-md text-lg leading-relaxed text-ink-secondary"
            style={{ "--d": 260 }}
          >
            Timetables, notices, events and student records in one place, for
            admins, faculty and students.
          </p>

          <div
            className="rise mt-10 flex flex-wrap items-center gap-4"
            style={{ "--d": 400 }}
          >
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-0 active:scale-[0.98]"
            >
              Sign in
              <ArrowRight
                size={18}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>
            {/* <button
              type="button"
              className="cursor-pointer rounded-full px-5 py-3.5 font-semibold text-secondary transition duration-200 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Request access
            </button> */}
          </div>
        </section>

        {/* Right: live timetable preview */}
        <section className="relative" aria-label="Today's timetable preview">
          <div
            className="rise rounded-3xl bg-night p-6 text-white sm:p-8"
            style={{ "--d": 200 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Monday</p>
                <h2 className="text-xl font-bold tracking-tight">
                  Today's timetable
                </h2>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-night-light px-3 py-1.5 text-sm text-white/80">
                <span className="pulse-dot relative h-2 w-2 rounded-full bg-success" />
                Live
              </span>
            </div>

            <div
              className="relative"
              style={{ height: ROW_H * PERIODS.length }}
            >
              {/* Moving "now" highlight */}
              <div
                className="now-marker absolute inset-x-0 top-0 rounded-2xl bg-primary"
                style={{
                  height: ROW_H - 8,
                  transform: `translateY(${active * ROW_H}px)`,
                }}
                aria-hidden="true"
              />
              {PERIODS.map((p, i) => (
                <div
                  key={p.time}
                  className="row-in absolute inset-x-0 flex items-center gap-4 px-4"
                  style={{
                    top: i * ROW_H,
                    height: ROW_H - 8,
                    "--d": i * 110,
                  }}
                >
                  <span
                    className={`w-14 text-sm font-semibold tabular-nums transition-colors duration-500 ${
                      i === active ? "text-white" : "text-white/50"
                    }`}
                  >
                    {p.time}
                  </span>
                  <span className="flex-1 font-semibold">{p.subject}</span>
                  <span
                    className={`text-sm transition-colors duration-500 ${
                      i === active ? "text-white/90" : "text-white/50"
                    }`}
                  >
                    {p.place}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notice toast */}
          <div className="toast-in absolute -bottom-6 left-4 flex max-w-[280px] items-start gap-3 rounded-2xl bg-surface p-4 shadow-xl shadow-night/10 sm:-left-8">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/25 text-night">
              <Bell size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold">New notice</p>
              <p className="text-sm text-ink-secondary">
                Physics Lab moved to Lab 3 today.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Intro;
