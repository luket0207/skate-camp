import React from "react";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import "./calendar.scss";

const DAY_NAMES = ["Wed", "Thu", "Fri", "Sat", "Sun"];
const SESSION_LABEL = {
  beginner: "Beginner",
  lesson: "Lesson",
  competition: "Competition",
  video: "Video",
};

const formatScheduleSummary = (entry) => {
  if (!entry?.setup) return null;
  const setup = entry.setup;
  if (entry.type === "beginner") return `Instructor: ${setup?.instructorName || "TBD"}`;
  if (entry.type === "lesson") return `${(setup?.selectedInstructorIds || []).length || 0} instructors | ${(setup?.selectedSkaterIds || []).length || 0} skaters`;
  if (entry.type === "competition") return `${setup?.level || "beginner"} | ${setup?.sport || "sport"} | ${setup?.slots || 4} slots`;
  if (entry.type === "video") return `${setup?.sport || "sport"} | ${setup?.mode || "new"} edit`;
  return null;
};

const Calendar = ({ timeState, dayAdvanceToken = 0, scheduledSessions = [], onDropSessionToDay, onDragScheduledStart }) => {
  const currentDayNumber = Math.max(1, Number(timeState?.dayNumber) || 1);
  const [isDayAdvancing, setIsDayAdvancing] = React.useState(false);
  const startDayNumber = Math.max(1, currentDayNumber - 2);
  const scheduleByDay = React.useMemo(() => {
    const map = new Map();
    (Array.isArray(scheduledSessions) ? scheduledSessions : []).forEach((entry) => {
      const day = Number(entry?.dayNumber || 0);
      if (day > 0) map.set(day, entry);
    });
    return map;
  }, [scheduledSessions]);

  React.useEffect(() => {
    if (dayAdvanceToken < 1) return undefined;
    setIsDayAdvancing(true);
    const timer = window.setTimeout(() => setIsDayAdvancing(false), 900);
    return () => window.clearTimeout(timer);
  }, [dayAdvanceToken]);

  const days = Array.from({ length: 7 }, (_, index) => {
    const dayNumber = startDayNumber + index;
    const dayOffset = dayNumber - currentDayNumber;
    const dayName = DAY_NAMES[(dayNumber - 1) % DAY_NAMES.length];
    const week = Math.floor((dayNumber - 1) / DAY_NAMES.length) + 1;
    const isCurrent = dayOffset === 0;
    const isPast = dayOffset < 0;
    const scheduled = scheduleByDay.get(dayNumber) || null;
    return {
      key: `${dayNumber}-${week}`,
      dayNumber,
      dayName,
      week,
      isCurrent,
      isPast,
      isFuture: dayOffset > 0,
      scheduled,
    };
  });

  return (
    <div className="calendarScene">
      <div className="calendarScene__header">
        <h2>Calendar</h2>
        <p>Time only advances when a session ends.</p>
      </div>

      <div className={`calendarScene__window${isDayAdvancing ? " calendarScene__window--dayAdvance" : ""}`}>
        {days.map((day, index) => (
          <div
            key={day.key}
            className={`calendarScene__day${day.isCurrent ? " calendarScene__day--current" : ""}${
              day.isPast ? " calendarScene__day--past" : ""
            }${isDayAdvancing && day.isCurrent ? " calendarScene__day--currentAdvance" : ""}${
              day.scheduled ? ` calendarScene__day--scheduled calendarScene__day--scheduled-${day.scheduled.type}` : ""
            }`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const raw = event.dataTransfer.getData("application/json");
              if (!raw) return;
              try {
                onDropSessionToDay(day.dayNumber, JSON.parse(raw));
              } catch {
                // ignore invalid payload
              }
            }}
          >
            <div className="calendarScene__slot">D{index + 1}</div>
            <div className="calendarScene__dayName">{day.dayName}</div>
            <div className="calendarScene__week">Week {day.week}</div>
            <div className="calendarScene__dayNumber">Day {day.dayNumber}</div>
            {day.scheduled ? (
              <div
                className="calendarScene__scheduled"
                draggable={day.dayNumber > currentDayNumber}
                onDragStart={(event) => {
                  const payload = { kind: "scheduled", scheduleId: day.scheduled.id };
                  event.dataTransfer.setData("application/json", JSON.stringify(payload));
                  onDragScheduledStart(payload);
                }}
              >
                <div className="calendarScene__scheduledType">{SESSION_LABEL[day.scheduled.type] || "Session"}</div>
                {formatScheduleSummary(day.scheduled) ? (
                  <div className="calendarScene__scheduledMeta">{formatScheduleSummary(day.scheduled)}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CalendarControls = ({ onGoToSkatepark, onOpenEdits }) => {
  return (
    <div className="calendarControls">
      <h3>Calendar Controls</h3>
      <Button variant={BUTTON_VARIANT.SECONDARY} to="/skaters">
        Skaters
      </Button>
      <Button variant={BUTTON_VARIANT.SECONDARY} to="/instructors">
        Instructors
      </Button>
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onOpenEdits}>
        Edits
      </Button>
      <Button variant={BUTTON_VARIANT.TERTIARY} onClick={onGoToSkatepark}>
        Go to Skatepark
      </Button>
    </div>
  );
};

export default Calendar;
