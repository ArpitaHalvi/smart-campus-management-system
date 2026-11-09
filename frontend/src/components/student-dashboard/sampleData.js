import { addDays, subWeeks } from "date-fns";

/**
 * SAMPLE DATA for the parts of the dashboard that have no backend yet:
 * attendance, timetable, assignments, notices and events.
 *
 * Everything is shaped like the real thing will be, so when those modules
 * exist the only change is to fetch these from the API instead of building
 * them here. Dates are generated relative to "now" so the dashboard always
 * looks current.
 */

export const ATTENDANCE_MINIMUM = 75; // percent a student must keep

/** [subject, classes attended, classes held] */
const SUBJECTS = [
  ["Data Structures", 33, 36],
  ["Communication Skills", 15, 16],
  ["Database Systems", 29, 33],
  ["Engineering Mathematics", 27, 34],
  ["Operating Systems", 22, 30],
  ["Physics Lab", 11, 18],
];

/** Weekly attendance %, oldest first (12 weeks ending this week). */
const WEEKLY = [88, 86, 90, 84, 81, 79, 83, 80, 78, 82, 85, 84];

/**
 * How many more classes can be missed and still stay at the minimum, or, if
 * already below it, how many in a row must be attended to get back.
 */
export function attendanceStanding(attended, held, minimum = ATTENDANCE_MINIMUM) {
  const m = minimum / 100;
  const percent = held ? (attended / held) * 100 : 0;
  if (percent >= minimum) {
    return { percent, safe: true, count: Math.max(0, Math.floor(attended / m - held)) };
  }
  return { percent, safe: false, count: Math.ceil((m * held - attended) / (1 - m)) };
}

const TIMETABLES = {
  1: [
    ["09:00", "10:00", "Data Structures", "Lecture", "Room 204", "Dr. A. Kapoor"],
    ["10:00", "11:00", "Engineering Mathematics", "Lecture", "Hall B", "Prof. S. Iyer"],
    ["11:30", "13:30", "Physics Lab", "Lab", "Lab 3", "Dr. R. Menon"],
    ["14:00", "15:00", "Database Systems", "Lecture", "Room 108", "Dr. N. Gupta"],
    ["15:00", "16:00", "Mentoring hour", "Tutorial", "Block C", "Dr. A. Kapoor"],
  ],
  2: [
    ["09:00", "10:00", "Operating Systems", "Lecture", "Room 204", "Prof. V. Joshi"],
    ["10:00", "12:00", "Data Structures", "Lab", "Computer Lab 2", "Dr. A. Kapoor"],
    ["13:00", "14:00", "Communication Skills", "Tutorial", "Room 110", "Ms. T. D'Souza"],
    ["14:00", "15:00", "Engineering Mathematics", "Lecture", "Hall B", "Prof. S. Iyer"],
  ],
  3: [
    ["09:00", "10:00", "Database Systems", "Lecture", "Room 108", "Dr. N. Gupta"],
    ["10:00", "11:00", "Operating Systems", "Lecture", "Room 204", "Prof. V. Joshi"],
    ["11:30", "13:30", "Database Systems", "Lab", "Computer Lab 1", "Dr. N. Gupta"],
    ["14:00", "15:00", "Engineering Mathematics", "Tutorial", "Room 112", "Prof. S. Iyer"],
  ],
  4: [
    ["09:00", "10:00", "Engineering Mathematics", "Lecture", "Hall B", "Prof. S. Iyer"],
    ["10:00", "11:00", "Data Structures", "Lecture", "Room 204", "Dr. A. Kapoor"],
    ["11:30", "13:30", "Physics Lab", "Lab", "Lab 3", "Dr. R. Menon"],
    ["14:00", "15:00", "Operating Systems", "Tutorial", "Room 206", "Prof. V. Joshi"],
  ],
  5: [
    ["09:00", "10:00", "Communication Skills", "Lecture", "Room 110", "Ms. T. D'Souza"],
    ["10:00", "11:00", "Database Systems", "Lecture", "Room 108", "Dr. N. Gupta"],
    ["11:30", "12:30", "Operating Systems", "Lecture", "Room 204", "Prof. V. Joshi"],
    ["14:00", "16:00", "Project studio", "Lab", "Innovation Lab", "Dr. A. Kapoor"],
  ],
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Today's classes in order, for the weekday of `now` (none on weekends). */
function timetableFor(now) {
  const rows = TIMETABLES[now.getDay()] ?? [];
  return rows.map(([start, end, subject, kind, room, faculty]) => ({
    start,
    end,
    startMin: toMinutes(start),
    endMin: toMinutes(end),
    subject,
    kind,
    room,
    faculty,
  }));
}

export function buildSampleDashboard(now = new Date()) {
  const subjects = SUBJECTS.map(([name, attended, held]) => ({
    name,
    attended,
    held,
    ...attendanceStanding(attended, held),
  })).sort((a, b) => a.percent - b.percent); // weakest first: that's where attention goes

  const attended = SUBJECTS.reduce((n, s) => n + s[1], 0);
  const held = SUBJECTS.reduce((n, s) => n + s[2], 0);

  const weekly = WEEKLY.map((value, i) => ({
    value,
    date: subWeeks(now, WEEKLY.length - 1 - i),
  }));

  const day = (n) => addDays(now, n);

  return {
    attendance: { attended, held, overall: attendanceStanding(attended, held), subjects, weekly },
    timetable: timetableFor(now),
    assignments: [
      { id: 1, title: "Binary tree traversal problem set", course: "Data Structures", due: day(1), status: "Not started" },
      { id: 2, title: "Lab report: simple pendulum", course: "Physics Lab", due: day(2), status: "In progress" },
      { id: 3, title: "ER diagram for a library system", course: "Database Systems", due: day(5), status: "Not started" },
      { id: 4, title: "Calculus assignment 4", course: "Engineering Mathematics", due: day(8), status: "Not started" },
      { id: 5, title: "Process scheduling write-up", course: "Operating Systems", due: day(12), status: "Not started" },
    ],
    notices: [
      { id: 1, title: "Mid-semester examination schedule released", from: "Examination cell", when: addDays(now, -1), kind: "Exams" },
      { id: 2, title: "Fee payment window closes on the 20th", from: "Accounts office", when: addDays(now, -2), kind: "Fees" },
      { id: 3, title: "Library will stay open until 9 pm during exams", from: "Central library", when: addDays(now, -4), kind: "Library" },
      { id: 4, title: "Campus placement orientation for final-year students", from: "Training and placement", when: addDays(now, -6), kind: "Placement" },
    ],
    events: [
      { id: 1, title: "Spandan technical fest", where: "Main auditorium", time: "10:00", date: day(3) },
      { id: 2, title: "Guest lecture: designing cloud systems", where: "Seminar hall", time: "14:30", date: day(6) },
      { id: 3, title: "Blood donation camp", where: "Health centre", time: "09:00", date: day(9) },
      { id: 4, title: "Inter-college football finals", where: "Sports ground", time: "16:00", date: day(15) },
    ],
  };
}
