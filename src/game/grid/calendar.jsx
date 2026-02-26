import React from "react";
import Button, { BUTTON_VARIANT } from "../../engine/ui/button/button";
import "./calendar.scss";

const DAY_NAMES = ["Wed", "Thu", "Fri", "Sat", "Sun"];

const Calendar = ({ timeState, dayAdvanceToken = 0 }) => {
  const currentDayNumber = Math.max(1, Number(timeState?.dayNumber) || 1);
  const [isDayAdvancing, setIsDayAdvancing] = React.useState(false);
  const startDayNumber = Math.max(1, currentDayNumber - 3);

  React.useEffect(() => {
    if (dayAdvanceToken < 1) return undefined;
    setIsDayAdvancing(true);
    const timer = window.setTimeout(() => setIsDayAdvancing(false), 900);
    return () => window.clearTimeout(timer);
  }, [dayAdvanceToken]);

  const days = Array.from({ length: 18 }, (_, index) => {
    const dayNumber = startDayNumber + index;
    const dayOffset = dayNumber - currentDayNumber;
    const dayName = DAY_NAMES[(dayNumber - 1) % DAY_NAMES.length];
    const week = Math.floor((dayNumber - 1) / DAY_NAMES.length) + 1;
    const isCurrent = dayOffset === 0;
    const isPast = dayOffset < 0;
    return {
      key: `${dayNumber}-${week}`,
      dayNumber,
      dayName,
      week,
      isCurrent,
      isPast,
      isFuture: dayOffset > 0,
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
            }${isDayAdvancing && day.isCurrent ? " calendarScene__day--currentAdvance" : ""}`}
          >
            <div className="calendarScene__slot">D{index + 1}</div>
            <div className="calendarScene__dayName">{day.dayName}</div>
            <div className="calendarScene__week">Week {day.week}</div>
            <div className="calendarScene__dayNumber">Day {day.dayNumber}</div>
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
