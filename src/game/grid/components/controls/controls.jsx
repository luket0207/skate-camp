import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { MIN_GRID_SIZE } from "../hooks/gridUtils";
import "./controls.scss";

const MAX_GRID_SIZE_FOR_UI = 9;

const Controls = ({
  gridSize,
  gridMode,
  editMode,
  sessionState,
  canStartTodaySession,
  todaySessionTypeLabel,
  isTutorialDayOne,
  canAdvanceTutorialDay,
  canExecuteLessonTick,
  canExecuteVideoTick,
  canEndSession,
  playerSkaterPoolCount,
  startingSpotsCapacity,
  dayNumber,
  dayName,
  weekNumber,
  hasSessionAvailableToday,
  onGridSizeChange,
  onToggleDeleteMode,
  onStartTodaySession,
  onAdvanceTutorialDay,
  onEndLessonSession,
  onEndCompetitionSession,
  onEndVideoSession,
  onExecuteLessonTick,
  onExecuteVideoTick,
  onEndSession,
}) => {
  return (
    <div className="gridControls">
      <div className="gridControls__clock">
        <div className="gridControls__clockLabel">Session Clock</div>
        <div className="gridControls__clockValue">{sessionState.clock?.ticksRemaining ?? sessionState.maxTicks}</div>
        <div className="gridControls__clockSubtext">
          Tick {sessionState.clock?.currentTick ?? sessionState.currentTick}/{sessionState.clock?.totalTicks ?? sessionState.maxTicks}
        </div>
      </div>

      <div className="gridControls__modeButtons">
        {gridMode === "session" && sessionState.sessionType === "lesson" ? (
          <>
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={onExecuteLessonTick}
              disabled={!canExecuteLessonTick}
            >
              Start
            </Button>
            <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onEndLessonSession} disabled={!canEndSession}>
              End Session
            </Button>
          </>
        ) : gridMode === "session" && sessionState.sessionType === "video" ? (
          <>
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={onExecuteVideoTick}
              disabled={!canExecuteVideoTick}
            >
              Start
            </Button>
            <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onEndVideoSession} disabled={!canEndSession}>
              End Session
            </Button>
          </>
        ) : gridMode === "session" ? (
          sessionState.sessionType === "competition" ? (
            <Button variant={BUTTON_VARIANT.PRIMARY} onClick={onEndCompetitionSession} disabled={!canEndSession}>
              End Session
            </Button>
          ) : (
            <Button variant={BUTTON_VARIANT.PRIMARY} onClick={onEndSession} disabled={!canEndSession}>
              End Session
            </Button>
          )
        ) : (
          <>
            {isTutorialDayOne ? (
              <Button
                variant={BUTTON_VARIANT.PRIMARY}
                onClick={onAdvanceTutorialDay}
                disabled={sessionState.isTickRunning || sessionState.isActive || !canAdvanceTutorialDay}
              >
                Next Day
              </Button>
            ) : (
              <Button
                variant={BUTTON_VARIANT.PRIMARY}
                onClick={onStartTodaySession}
                disabled={sessionState.isTickRunning || sessionState.isActive || !canStartTodaySession}
              >
                {`Start ${todaySessionTypeLabel} Session`}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="gridControls__sessionInfo">
        <div>
          Time: {dayName} (Day {dayNumber}) | Week {weekNumber}
        </div>
        <div>Session Available Today: {hasSessionAvailableToday ? "Yes" : "No"}</div>
        <div>Mode: {gridMode === "edit" ? "Edit Skatepark" : "Session"}</div>
        <div>
          Tick: {sessionState.currentTick}/{sessionState.maxTicks}
        </div>
        <div>Session Type: {sessionState.sessionType}</div>
        <div>Pool Size: {playerSkaterPoolCount}</div>
        <div>Starting Spots: {startingSpotsCapacity}</div>
      </div>

      {gridMode === "edit" && (
        <div className="gridControls__editPanel">
          <div className="gridControls__group">
            <label>Grid Size</label>
            <div className="gridControls__sizeAdjust">
              <Button
                variant={BUTTON_VARIANT.SECONDARY}
                onClick={() => onGridSizeChange(gridSize - 1)}
                disabled={gridSize <= MIN_GRID_SIZE}
              >
                Decrease
              </Button>
              <div className="gridControls__sizeValue">{gridSize}x{gridSize}</div>
              <Button
                variant={BUTTON_VARIANT.SECONDARY}
                onClick={() => onGridSizeChange(gridSize + 1)}
                disabled={gridSize >= MAX_GRID_SIZE_FOR_UI}
              >
                Increase
              </Button>
            </div>
          </div>

          <div className="gridControls__group">
            <Button
              variant={editMode === "delete" ? BUTTON_VARIANT.SECONDARY : BUTTON_VARIANT.RED}
              onClick={onToggleDeleteMode}
            >
              {editMode === "delete" ? (
                "Stop Deleting"
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrashCan} style={{ marginRight: "0.45rem" }} />
                  Delete Pieces
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Controls;
