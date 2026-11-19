import { format } from "date-fns";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const GRID_COLUMNS = 7; // 1 time column + 6 day columns

/**
 * Weekly timetable grid component.
 * Shows classes in a visual calendar format with time slots.
 * On smaller screens, delegates to DayWiseList.
 */
function TimetableGrid({ entries, isEditable, onEdit, onDelete }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <p className="font-medium">No classes scheduled</p>
        <p className="text-sm text-ink-secondary">Add a class to get started</p>
      </div>
    );
  }

  // Get all unique times from entries (sort them)
  const allTimes = new Set();
  entries.forEach((entry) => {
    allTimes.add(entry.start_time);
  });

  const sortedTimes = Array.from(allTimes).sort();

  // Helper: get cells for a time slot across all days
  const getSlotEntries = (time) => {
    const result = {};
    DAYS.forEach((day) => {
      result[day] = entries.filter(
        (e) => e.day === day && e.start_time === time
      );
    });
    return result;
  };

  // Helper: format time for display
  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":");
    return `${hours}:${minutes}`;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-background">
            <th scope="col" className="px-3 py-3 font-medium text-ink-secondary w-20">
              Time
            </th>
            {DAYS.map((day) => (
              <th
                key={day}
                scope="col"
                className="px-3 py-3 font-medium text-center text-ink-secondary min-w-36"
              >
                {day[0] + day.slice(1).toLowerCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTimes.map((time) => {
            const slotEntries = getSlotEntries(time);
            const maxRowsInSlot = Math.max(
              ...DAYS.map((day) => slotEntries[day].length)
            );

            return (
              <tr key={time} className="border-b border-line hover:bg-background last:border-b-0">
                <td className="px-3 py-3 font-medium text-ink-secondary whitespace-nowrap">
                  {formatTime(time)}
                </td>
                {DAYS.map((day) => (
                  <td
                    key={`${day}-${time}`}
                    className="px-2 py-2 align-top"
                  >
                    <div className="space-y-1">
                      {slotEntries[day].map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-md bg-primary/10 border border-primary p-2 text-xs"
                        >
                          <p className="font-medium text-primary truncate">
                            {entry.subject_details?.code}
                          </p>
                          <p className="text-[0.7rem] text-ink-secondary truncate">
                            {entry.faculty_details?.user_details?.first_name}{" "}
                            {entry.faculty_details?.user_details?.last_name}
                          </p>
                          <p className="text-[0.7rem] text-ink-secondary">
                            {entry.room}
                          </p>
                          {isEditable && (
                            <div className="mt-1 flex gap-1">
                              <button
                                onClick={() => onEdit(entry.id)}
                                className="rounded px-1.5 py-0.5 text-[0.65rem] font-medium bg-primary/20 text-primary hover:bg-primary/30"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDelete(entry.id)}
                                className="rounded px-1.5 py-0.5 text-[0.65rem] font-medium bg-danger/20 text-danger hover:bg-danger/30"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TimetableGrid;
