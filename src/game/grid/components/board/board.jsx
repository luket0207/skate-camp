import React from "react";
import Tile from "../tile/tile";
import RouteModeControls from "../routeModeControls/routeModeControls";
import { makeTileKey } from "../hooks/gridUtils";
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
  getDropPreviewTiles,
}) => {
  const [previewTileKeys, setPreviewTileKeys] = React.useState(new Set());
  const tiles = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      tiles.push({ row, col });
    }
  }

  const handleTileDragHover = React.useCallback((row, col, payload) => {
    const pieceId = payload?.pieceId;
    if (!pieceId || !getDropPreviewTiles) {
      setPreviewTileKeys((prev) => (prev.size ? new Set() : prev));
      return;
    }
    const previewTiles = getDropPreviewTiles(row, col, pieceId);
    const nextKeys = new Set(previewTiles.map((tile) => makeTileKey(tile.row, tile.col)));
    setPreviewTileKeys(nextKeys);
  }, [getDropPreviewTiles]);

  const clearPreview = React.useCallback(() => {
    setPreviewTileKeys((prev) => (prev.size ? new Set() : prev));
  }, []);

  return (
    <div
      className="gridBoard"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          clearPreview();
        }
      }}
      onDrop={clearPreview}
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
            onDragHover={handleTileDragHover}
            isDropPreview={previewTileKeys.has(key)}
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
