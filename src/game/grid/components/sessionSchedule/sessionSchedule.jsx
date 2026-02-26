import React from "react";
import "./sessionSchedule.scss";

const SESSION_LABEL = {
  beginner: "Beginner Session",
  lesson: "Lesson Session",
  competition: "Competition Session",
  video: "Video Session",
};

const SessionSchedule = ({
  availability = {},
  onDragTemplateStart,
  onDropRemoveScheduled,
}) => {
  const sessionTypes = ["beginner", "lesson", "competition", "video"];

  return (
    <section
      className="sessionSchedule"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData("application/json");
        if (!raw) return;
        try {
          const payload = JSON.parse(raw);
          onDropRemoveScheduled(payload);
        } catch {
          // ignore malformed payloads
        }
      }}
    >
      <h3>Session Schedule</h3>
      <div className="sessionSchedule__list">
        {sessionTypes.map((type) => {
          const isEnabled = Boolean(availability[type]?.enabled);
          const reason = availability[type]?.reason || "";
          return (
            <article key={type} className={`sessionSchedule__item${isEnabled ? "" : " sessionSchedule__item--disabled"}`}>
              <div className="sessionSchedule__name">{SESSION_LABEL[type]}</div>
              {!isEnabled && reason ? <div className="sessionSchedule__reason">{reason}</div> : null}
              <div
                className="sessionSchedule__chip"
                draggable={isEnabled}
                onDragStart={(event) => {
                  if (!isEnabled) return;
                  const payload = { kind: "template", sessionType: type };
                  event.dataTransfer.setData("application/json", JSON.stringify(payload));
                  onDragTemplateStart(payload);
                }}
              >
                Drag to Calendar
              </div>
            </article>
          );
        })}
      </div>
      <div className="sessionSchedule__removeZone">Drop Here to Remove Scheduled Session</div>
    </section>
  );
};

export default SessionSchedule;
