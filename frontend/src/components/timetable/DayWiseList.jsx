import { format } from "date-fns";

const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

/**
 * Day-wise list view for timetable.
 * Shows classes grouped by day with time information.
 * Used as fallback on smaller screens or as alternative view.
 */
function DayWiseList({ entries, isEditable, onEdit, onDelete }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <p className="font-medium">No classes scheduled</p>
        <p className="text-sm text-ink-secondary">Add a class to get started</p>
      </div>
    );
  }

  // Group entries by day
  const entriesByDay = {};
  DAYS_ORDER.forEach((day) => {
    entriesByDay[day] = entries
      .filter((e) => e.day === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  // Filter out empty days
  const nonEmptyDays = DAYS_ORDER.filter((day) => entriesByDay[day].length > 0);

  return (
    <div className="space-y-4">
      {nonEmptyDays.map((day) => (
        <section key={day} className="rounded-xl border border-line bg-surface p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {day[0] + day.slice(1).toLowerCase()}
          </h3>

          <div className="space-y-3">
            {entriesByDay[day].map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-line-strong bg-background p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">
                        {entry.subject_details?.code}
                      </span>
                      <span className="text-sm text-ink-secondary">
                        {entry.subject_details?.name}
                      </span>
                    </div>

                    <div className="text-sm text-ink-secondary">
                      <p>
                        <span className="font-medium">Time:</span> {entry.start_time} -{" "}
                        {entry.end_time}
                      </p>
                      <p>
                        <span className="font-medium">Faculty:</span>{" "}
                        {entry.faculty_details?.user_details?.first_name}{" "}
                        {entry.faculty_details?.user_details?.last_name}
                      </p>
                      <p>
                        <span className="font-medium">Room:</span> {entry.room}
                      </p>
                      {entry.section_details && (
                        <p>
                          <span className="font-medium">Section:</span>{" "}
                          {entry.section_details?.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditable && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onEdit(entry.id)}
                        className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="rounded-md border border-danger bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/20"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default DayWiseList;
