import React from "react";
import Tile from "../tile/tile";
import RouteModeControls from "../routeModeControls/routeModeControls";
import "./board.scss";

const Board = ({
  gridSize,
  occupancy,
  skaterMarkers,
  editingRoute,
  onCancelRoute,
  onCommitRoute,
  onRemoveLastRoutePiece,
  onTileDrop,
  onTileClick,
}) => {
  const tiles = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      tiles.push({ row, col });
    }
  }

  return (
    <div
      className="gridBoard"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
      }}
    >
      {tiles.map((tile) => {
        const key = `${tile.row}-${tile.col}`;
        return (
          <Tile
            key={key}
            row={tile.row}
            col={tile.col}
            occupant={occupancy.get(key)}
            skaters={skaterMarkers.get(key) || []}
            onDrop={onTileDrop}
            onClick={onTileClick}
          />
        );
      })}

      {editingRoute?.pieces?.[0] && (
        <RouteModeControls
          startPiece={editingRoute.pieces[0]}
          complete={Boolean(editingRoute.complete)}
          routeLength={editingRoute.pieces.length}
          currentSpeed={editingRoute.currentSpeed || 0}
          onCancelRoute={onCancelRoute}
          onRemoveLastRoutePiece={onRemoveLastRoutePiece}
          onCommitRoute={onCommitRoute}
        />
      )}
    </div>
  );
};

export default Board;
