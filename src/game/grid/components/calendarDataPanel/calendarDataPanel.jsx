import React from "react";
import "./calendarDataPanel.scss";

const DETAIL_FIELDS = [
  { key: "wage", label: "Wage" },
  { key: "sport", label: "Sport" },
  { key: "lessonSlots", label: "Lesson Slots" },
  { key: "scoutRating", label: "Scout Rating" },
  { key: "coreRating", label: "Core Rating" },
  { key: "variantRating", label: "Variant Rating" },
  { key: "determination", label: "Determination" },
  { key: "switchRating", label: "Switch Rating" },
];

const RATING_FIELDS = [
  { key: "stall", label: "Stall" },
  { key: "grind", label: "Grind" },
  { key: "tech", label: "Tech" },
  { key: "spin", label: "Spin" },
  { key: "bigAir", label: "Big Air" },
];

const CalendarDataPanel = ({ instructors = [] }) => {
  return (
    <section className="calendarDataPanel">
      <h3>Hired Instructors</h3>
      {instructors.length < 1 && <div className="calendarDataPanel__empty">No instructors hired yet.</div>}
      {instructors.map((instructor) => (
        <article key={instructor.id} className="calendarDataPanel__item">
          <div className="calendarDataPanel__name">{instructor.name}</div>
          <div className="calendarDataPanel__description">{instructor.description}</div>
          <div className="calendarDataPanel__metaGrid">
            {DETAIL_FIELDS.map((field) => (
              <div key={`${instructor.id}-${field.key}`} className="calendarDataPanel__metaRow">
                <span className="calendarDataPanel__label">{field.label}</span>
                <span className="calendarDataPanel__value">{instructor[field.key]}</span>
              </div>
            ))}
          </div>
          <div className="calendarDataPanel__ratingsTitle">Teaching Ratings</div>
          <div className="calendarDataPanel__metaGrid">
            {RATING_FIELDS.map((field) => (
              <div key={`${instructor.id}-rating-${field.key}`} className="calendarDataPanel__metaRow">
                <span className="calendarDataPanel__label">{field.label}</span>
                <span className="calendarDataPanel__value">{instructor?.ratings?.[field.key] ?? 0}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
};

export default CalendarDataPanel;
