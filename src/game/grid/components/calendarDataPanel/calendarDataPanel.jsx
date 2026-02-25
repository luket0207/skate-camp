import React from "react";
import "./calendarDataPanel.scss";

const CalendarDataPanel = ({ instructors = [] }) => {
  return (
    <section className="calendarDataPanel">
      <h3>Hired Instructors</h3>
      {instructors.length < 1 && <div className="calendarDataPanel__empty">No instructors hired yet.</div>}
      {instructors.map((instructor) => (
        <article key={instructor.id} className="calendarDataPanel__item">
          <div className="calendarDataPanel__name">{instructor.name}</div>
          <div className="calendarDataPanel__meta">
            {instructor.sport} | Slots {instructor.lessonSlots} | Wage {instructor.wage}
          </div>
        </article>
      ))}
    </section>
  );
};

export default CalendarDataPanel;
