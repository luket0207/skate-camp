import React from "react";
import "./piecePalette.scss";

const renderRouteType = (routeType) => routeType.join(", ");

const createStandaloneDragPreview = (piece, tileSizePx) => {
  const gapPx = 4;
  const preview = document.createElement("div");
  preview.style.position = "fixed";
  preview.style.left = "-9999px";
  preview.style.top = "-9999px";
  preview.style.pointerEvents = "none";
  preview.style.display = "grid";
  preview.style.gridTemplateColumns = `repeat(${piece.size.cols}, ${tileSizePx}px)`;
  preview.style.gap = `${gapPx}px`;
  preview.style.padding = "2px";
  preview.style.background = "rgba(0,0,0,0.05)";
  preview.style.borderRadius = "8px";

  const tileCount = piece.size.rows * piece.size.cols;
  for (let i = 0; i < tileCount; i++) {
    const tile = document.createElement("div");
    tile.style.width = `${tileSizePx}px`;
    tile.style.height = `${tileSizePx}px`;
    tile.style.background = piece.color;
    tile.style.border = "1px solid rgba(0,0,0,0.28)";
    tile.style.borderRadius = "6px";
    tile.style.boxSizing = "border-box";
    preview.appendChild(tile);
  }

  return preview;
};

const onPieceDragStart = (event, piece) => {
  event.dataTransfer.setData("application/json", JSON.stringify({ pieceId: piece.id }));

  const isMultiTileStandalone =
    piece.type === "Standalone" &&
    piece.size &&
    piece.size.rows * piece.size.cols > 1;

  if (!isMultiTileStandalone) return;

  const tileSizePx = Math.max(1, Math.round(event.currentTarget.getBoundingClientRect().width || 40));
  const preview = createStandaloneDragPreview(piece, tileSizePx);
  document.body.appendChild(preview);

  event.dataTransfer.setDragImage(preview, tileSizePx / 2, tileSizePx / 2);

  const cleanup = () => {
    preview.remove();
    event.currentTarget.removeEventListener("dragend", cleanup);
  };

  event.currentTarget.addEventListener("dragend", cleanup);
};

const PieceCard = ({ piece }) => (
  <div className="pieceItem">
    <button
      type="button"
      className="pieceCard"
      title={piece.name}
      draggable
      onDragStart={(event) => onPieceDragStart(event, piece)}
      style={{ backgroundColor: piece.color }}
    >
      {piece.marker}
    </button>

    <div className="pieceItem__meta">
      {piece.type === "Standalone"
        ? `${piece.size.rows}x${piece.size.cols}`
        : renderRouteType(piece.routeType)}
    </div>
  </div>
);

const PiecePalette = ({ standalonePieces, routePieces, routeModeActive }) => {
  return (
    <aside className="piecePalette">
      <h3>Piece Palette</h3>
      <p>Drag pieces onto the grid.</p>

      <h4>Standalone Pieces</h4>
      <div className="piecePalette__list piecePalette__list--row">
        {standalonePieces.map((piece) => (
          <PieceCard key={piece.id} piece={piece} />
        ))}
      </div>

      <h4>Route Pieces {routeModeActive ? "(Route Mode Active)" : ""}</h4>
      <div className="piecePalette__list piecePalette__list--row">
        {routePieces.map((piece) => (
          <PieceCard key={piece.id} piece={piece} />
        ))}
      </div>
    </aside>
  );
};

export default PiecePalette;
