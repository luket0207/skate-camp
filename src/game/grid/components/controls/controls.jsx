import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { MAX_GRID_SIZE, MIN_GRID_SIZE } from "../hooks/gridUtils";
import "./controls.scss";

const Controls = ({
  gridSize,
  mode,
  editingRoute,
  onGridSizeChange,
  onToggleDeleteMode,
  onCancelRoute,
  onCommitRoute,
}) => {
  const sizes = [];
  for (let value = MIN_GRID_SIZE; value <= MAX_GRID_SIZE; value++) {
    sizes.push(value);
  }

  return (
    <div className="gridControls">
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
          variant={mode === "delete" ? BUTTON_VARIANT.SECONDARY : BUTTON_VARIANT.PRIMARY}
          onClick={onToggleDeleteMode}
        >
          {mode === "delete" ? "Stop Deleting" : "Delete Pieces"}
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
          <span className="gridControls__routeStatus">
            Route Mode: Inactive
          </span>
        )}
      </div>
    </div>
  );
};

export default Controls;
