import React from "react";
import "./calendarDataPanel.scss";

const CalendarDataPanel = ({ instructors = [], skaters = [] }) => {
  return (
    <section className="calendarDataPanel">
      <div className="calendarDataPanel__columns">
        <div className="calendarDataPanel__col">
          <h3>Instructors</h3>
          <div className="calendarDataPanel__scroll">
            {instructors.length < 1 && <div className="calendarDataPanel__empty">No instructors hired yet.</div>}
            {instructors.map((instructor) => (
              <article key={instructor.id} className="calendarDataPanel__item">
                <div className="calendarDataPanel__name">{instructor.name}</div>
                <div className="calendarDataPanel__metaRow">
                  <span className="calendarDataPanel__label">Slots Left</span>
                  <span className="calendarDataPanel__value">
                    {Number(instructor?.lessonSlotsRemaining ?? instructor?.lessonSlotsBase ?? instructor?.lessonSlots ?? 0)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="calendarDataPanel__col">
          <h3>Skaters</h3>
          <div className="calendarDataPanel__scroll">
            {skaters.length < 1 && <div className="calendarDataPanel__empty">No skaters in pool.</div>}
            {skaters.map((skater) => (
              <article key={skater.id} className="calendarDataPanel__item">
                <div className="calendarDataPanel__name">{skater.name}</div>
                <div className="calendarDataPanel__metaRow">
                  <span className="calendarDataPanel__label">Skill</span>
                  <span className="calendarDataPanel__value">{Number(skater?.skillLevel || 0)}</span>
                </div>
                <div className="calendarDataPanel__metaRow">
                  <span className="calendarDataPanel__label">Sponsored</span>
                  <span className="calendarDataPanel__value">{skater?.isSponsored ? "Yes" : "No"}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CalendarDataPanel;
