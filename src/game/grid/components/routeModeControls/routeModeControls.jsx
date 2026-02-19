import React from "react";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import "./routeModeControls.scss";

const RouteModeControls = ({
  startPiece,
  complete,
  routeLength,
  currentSpeed,
  onCancelRoute,
  onRemoveLastRoutePiece,
  onCommitRoute,
}) => {
  const style = {
    left: `calc(var(--board-padding) + (${startPiece.col} * (var(--tile-size) + var(--tile-gap))) + var(--tile-size))`,
    top: `calc(var(--board-padding) + (${startPiece.row} * (var(--tile-size) + var(--tile-gap))))`,
  };

  return (
    <div className="routeModeControls" style={style}>
      <div className="routeModeControls__status">Route: {complete ? "Complete" : "In Progress"}</div>
      <div className="routeModeControls__status">Speed: {currentSpeed}</div>
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onCancelRoute}>
        Cancel Route
      </Button>
      {routeLength > 1 && (
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRemoveLastRoutePiece}>
          Remove Last Piece
        </Button>
      )}
      {complete && (
        <Button variant={BUTTON_VARIANT.PRIMARY} onClick={onCommitRoute}>
          Commit Route
        </Button>
      )}
    </div>
  );
};

export default RouteModeControls;
