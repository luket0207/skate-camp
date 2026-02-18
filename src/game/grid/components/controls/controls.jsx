import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { MAX_GRID_SIZE, MIN_GRID_SIZE } from "../hooks/gridUtils";
import { SKATER_SPORT } from "../../../skaters/skaterUtils";
import "./controls.scss";

const Controls = ({
  gridSize,
  gridMode,
  editMode,
  editingRoute,
  sessionState,
  beginnerSport,
  canStartBeginnerSession,
  canStartNormalSession,
  playerSkaterPoolCount,
  startingSpotsCapacity,
  onGridSizeChange,
  onToggleDeleteMode,
  onCancelRoute,
  onCommitRoute,
  onStartBeginnerSession,
  onStartNormalSession,
  onGoToEditMode,
  onAdvanceTick,
  onBeginnerSportChange,
}) => {
  const sizes = [];
  for (let value = MIN_GRID_SIZE; value <= MAX_GRID_SIZE; value++) {
    sizes.push(value);
  }

  return (
    <div className="gridControls">
      <div className="gridControls__modeButtons">
        <div className="gridControls__group">
          <label htmlFor="beginner-sport-select">Beginner Sport</label>
          <select
            id="beginner-sport-select"
            value={beginnerSport}
            onChange={(event) => onBeginnerSportChange(event.target.value)}
            disabled={sessionState.isActive}
          >
            <option value={SKATER_SPORT.SKATEBOARDER}>Skateboarder</option>
            <option value={SKATER_SPORT.ROLLERBLADER}>Rollerblader</option>
          </select>
        </div>

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

        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onGoToEditMode} disabled={sessionState.isActive}>
          Edit Skatepark
        </Button>

        <Button
          variant={BUTTON_VARIANT.TERTIARY}
          onClick={onAdvanceTick}
          disabled={gridMode !== "session" || !sessionState.isActive || sessionState.isTickRunning}
        >
          Advance Tick
        </Button>

        <Button variant={BUTTON_VARIANT.TERTIARY} to="/skaters">
          View Skaters
        </Button>
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

          <div className="gridControls__routeBlock">
            {editingRoute ? (
              <>
                <span className="gridControls__routeStatus">
                  Route Mode: {editingRoute.complete ? "Complete" : "Incomplete"}
                </span>

                <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onCancelRoute}>
                  Cancel Route
                </Button>

                {editingRoute.complete && (
                  <Button variant={BUTTON_VARIANT.PRIMARY} onClick={onCommitRoute}>
                    Commit Route
                  </Button>
                )}
              </>
            ) : (
              <span className="gridControls__routeStatus">Route Mode: Inactive</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Controls;
