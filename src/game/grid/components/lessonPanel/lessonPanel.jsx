import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import "./lessonPanel.scss";

const LessonPanel = ({
  lessonState,
  selectedInstructors,
  selectedSkaters,
  onSelectInstructorForPlacement,
  onEndLessonSession,
}) => {
  const isPlacementPhase = Boolean(lessonState?.isPlacementPhase);

  return (
    <section className="lessonPanel">
      <h3>Lesson Session</h3>
      <div className="lessonPanel__meta">Tick {lessonState?.currentTick || 0}/{lessonState?.maxTicks || 10}</div>

      {isPlacementPhase ? (
        <>
          <div className="lessonPanel__hint">
            Select an instructor below, then click a glowing route/standalone on the board to place them.
          </div>
          <div className="lessonPanel__list">
            {selectedInstructors.map((instructor) => {
              const linkedSkater = selectedSkaters.find((skater) => skater.id === lessonState?.selectedSkaterByInstructor?.[instructor.id]);
              const placedTarget = lessonState?.placementsByInstructor?.[instructor.id];
              const isActive = lessonState?.activePlacementInstructorId === instructor.id;
              return (
                <article
                  key={instructor.id}
                  className={`lessonPanel__item${isActive ? " lessonPanel__item--active" : ""}${placedTarget ? " lessonPanel__item--placed" : ""}`}
                >
                  <div className="lessonPanel__itemTop">
                    <strong>{instructor.name}</strong>
                    <span>{instructor.sport}</span>
                  </div>
                  <div className="lessonPanel__itemMeta">
                    <span>Skater: {linkedSkater?.name || "Unassigned"}</span>
                    <span>Target: {placedTarget?.label || "Not placed"}</span>
                  </div>
                  <Button
                    variant={BUTTON_VARIANT.SECONDARY}
                    onClick={() => onSelectInstructorForPlacement(instructor.id)}
                  >
                    {placedTarget ? "Move Placement" : "Place Instructor"}
                  </Button>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="lessonPanel__hint">Lesson setup complete. Main lesson loop will be added next.</div>
          <Button variant={BUTTON_VARIANT.PRIMARY} onClick={onEndLessonSession}>
            End Session
          </Button>
        </>
      )}
    </section>
  );
};

export default LessonPanel;
