import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import "./lessonPanel.scss";

const LessonPanel = ({
  lessonState,
  selectedInstructors,
  selectedSkaters,
  trickTypeOptionsByInstructor,
  onSelectInstructorForPlacement,
  onUpdateTickAssignment,
  onRandomizeTickAssignments,
  onEndLessonSession,
}) => {
  const isPlacementPhase = Boolean(lessonState?.isPlacementPhase);
  const tickAssignments = lessonState?.tickAssignmentsByInstructor || {};
  const lockedRetries = lessonState?.lockedRetriesByInstructor || {};
  const pendingTickEntries = lessonState?.pendingTickEntries || [];
  const historyEntries = lessonState?.attemptEntries || [];
  const isTickRunning = Boolean(lessonState?.isTickRunning);

  return (
    <section className="lessonPanel">
      <h3>Lesson Session</h3>
      <div className="lessonPanel__meta">Tick {lessonState?.currentTick || 0}/{lessonState?.maxTicks || 10}</div>
      {!isPlacementPhase && (
        <Button
          variant={BUTTON_VARIANT.SECONDARY}
          onClick={onRandomizeTickAssignments}
          disabled={isTickRunning}
        >
          Randomise
        </Button>
      )}

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
          <div className="lessonPanel__hint">
            Assign 1 skater per instructor and select a trick type. Use the Start button in controls on the right to let the skaters do their runs.
          </div>
          <div className="lessonPanel__list">
            {selectedInstructors.map((instructor) => {
              const placedTarget = lessonState?.placementsByInstructor?.[instructor.id];
              const locked = lockedRetries[instructor.id];
              const assignment = tickAssignments[instructor.id] || {};
              const allowedTypes = trickTypeOptionsByInstructor?.[instructor.id] || [];
              return (
                <article key={instructor.id} className="lessonPanel__item lessonPanel__item--placed">
                  <div className="lessonPanel__itemTop">
                    <strong>{instructor.name}</strong>
                    <span>{instructor.sport}</span>
                  </div>
                  <div className="lessonPanel__itemMeta">
                    <span>Target: {placedTarget?.label || "Not placed"}</span>
                    {locked?.attempt?.trickName ? (
                      <span>Locked Retry: {locked.attempt.trickName}</span>
                    ) : (
                      <span>Status: Awaiting assignment</span>
                    )}
                  </div>

                  {locked ? (
                    <div className="lessonPanel__lockedRow">
                      <span>Skater locked: {(selectedSkaters.find((s) => s.id === locked.skaterId)?.name) || "Unknown"}</span>
                    </div>
                  ) : (
                    <div className="lessonPanel__assignmentGrid">
                      <label>
                        Skater
                        <select
                          value={assignment.skaterId || ""}
                          onChange={(event) => onUpdateTickAssignment(instructor.id, { skaterId: event.target.value || null })}
                        >
                          <option value="">Select skater</option>
                          {selectedSkaters.map((skater) => (
                            <option key={`${instructor.id}-skater-${skater.id}`} value={skater.id}>
                              {skater.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Trick Type
                        <select
                          value={assignment.trickType || ""}
                          onChange={(event) => onUpdateTickAssignment(instructor.id, { trickType: event.target.value || null })}
                        >
                          <option value="">Select type</option>
                          {allowedTypes.includes("stall") && <option value="stall">Stall</option>}
                          {allowedTypes.includes("grind") && <option value="grind">Grind</option>}
                          {allowedTypes.includes("tech") && <option value="tech">Tech</option>}
                          {allowedTypes.includes("spin") && <option value="spin">Spin</option>}
                          {allowedTypes.includes("bigAir") && <option value="bigAir">Big Air</option>}
                        </select>
                      </label>
                      {allowedTypes.length < 1 && (
                        <div className="lessonPanel__lockedRow">No trick types available on this target.</div>
                      )}

                      <label>
                        Max Level
                        <select
                          value={assignment.maxCoreLevel || ""}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            onUpdateTickAssignment(instructor.id, { maxCoreLevel: Number.isFinite(value) && value > 0 ? value : null });
                          }}
                        >
                          <option value="">Highest</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                      </label>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {pendingTickEntries.length > 0 && (
            <div className="lessonPanel__results">
              <strong>Last Tick Results</strong>
              {pendingTickEntries.map((entry) => (
                <div key={entry.id} className="lessonPanel__resultItem">
                  T{entry.tick} | {entry.skaterName} with {entry.instructorName}: {entry.trickName} - {entry.status}
                </div>
              ))}
            </div>
          )}

          <div className="lessonPanel__historyCount">Total Attempts: {historyEntries.length}</div>
        </>
      )}
    </section>
  );
};

export default LessonPanel;
