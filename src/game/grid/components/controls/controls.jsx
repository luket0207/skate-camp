import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { MAX_GRID_SIZE, MIN_GRID_SIZE } from "../hooks/gridUtils";
import "./controls.scss";

const Controls = ({
  gridSize,
  gridMode,
  editMode,
  sessionState,
  canStartBeginnerSession,
  canStartNormalSession,
  canEndSession,
  playerSkaterPoolCount,
  startingSpotsCapacity,
  onGridSizeChange,
  onToggleDeleteMode,
  onStartBeginnerSession,
  onStartNormalSession,
  onEndSession,
}) => {
  const sizes = [];
  for (let value = MIN_GRID_SIZE; value <= MAX_GRID_SIZE; value++) {
    sizes.push(value);
  }

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
        {gridMode === "session" ? (
          <Button variant={BUTTON_VARIANT.PRIMARY} onClick={onEndSession} disabled={!canEndSession}>
            End Session
          </Button>
        ) : (
          <>
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={onStartBeginnerSession}
              disabled={sessionState.isTickRunning || sessionState.isActive || !canStartBeginnerSession}
            >
              Start Beginner Session
            </Button>

            <Button
              variant={BUTTON_VARIANT.SECONDARY}
              onClick={onStartNormalSession}
              disabled={sessionState.isTickRunning || sessionState.isActive || !canStartNormalSession}
            >
              Start Normal Session
            </Button>

            <Button variant={BUTTON_VARIANT.TERTIARY} to="/skaters">
              View Skaters
            </Button>
          </>
        )}
      </div>

      <div className="gridControls__sessionInfo">
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
            <label htmlFor="grid-size-select">Grid Size</label>
            <select id="grid-size-select" value={gridSize} onChange={(event) => onGridSizeChange(event.target.value)}>
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size}x{size}
                </option>
              ))}
            </select>
          </div>

          <div className="gridControls__group">
            <Button
              variant={editMode === "delete" ? BUTTON_VARIANT.SECONDARY : BUTTON_VARIANT.PRIMARY}
              onClick={onToggleDeleteMode}
            >
              {editMode === "delete" ? "Stop Deleting" : "Delete Pieces"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Controls;
