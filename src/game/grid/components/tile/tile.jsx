import React from "react";
import "./tile.scss";

const Tile = ({ row, col, occupant, skaters, onDrop, onClick, onDragHover, isDropPreview }) => {
  const classNames = ["gridTile"];

  if (occupant) classNames.push("gridTile--occupied");
  if (occupant?.kind === "editing-route") classNames.push("gridTile--editingRoute");
  if (occupant?.kind === "standalone" && occupant?.imageUrl) classNames.push("gridTile--standaloneImage");
  if (isDropPreview) classNames.push("gridTile--dropPreview");
  const tileStyle = {};
  const pieceImageStyle = occupant?.imageUrl ? {
    backgroundImage: `url("${occupant.imageUrl}")`,
    backgroundRepeat: "no-repeat",
    backgroundColor: "transparent",
    backgroundSize:
      occupant.kind === "standalone" && occupant.spanRows && occupant.spanCols
        ? `calc(${occupant.spanCols} * var(--tile-size) + ${(occupant.spanCols - 1)} * var(--tile-gap)) calc(${occupant.spanRows} * var(--tile-size) + ${(occupant.spanRows - 1)} * var(--tile-gap))`
        : "cover",
    backgroundPosition:
      occupant.kind === "standalone" && occupant.spanRows && occupant.spanCols
        ? `calc(-${occupant.offsetCol || 0} * (var(--tile-size) + var(--tile-gap))) calc(-${occupant.offsetRow || 0} * (var(--tile-size) + var(--tile-gap)))`
        : "center",
    transform: occupant.rotationDeg ? `rotate(${occupant.rotationDeg}deg)` : undefined,
    width:
      occupant.kind === "standalone" &&
      occupant.spanCols &&
      (occupant.offsetCol || 0) < occupant.spanCols - 1
        ? "calc(var(--tile-size) + var(--tile-gap))"
        : "var(--tile-size)",
    height:
      occupant.kind === "standalone" &&
      occupant.spanRows &&
      (occupant.offsetRow || 0) < occupant.spanRows - 1
        ? "calc(var(--tile-size) + var(--tile-gap))"
        : "var(--tile-size)",
  } : null;
  if (!occupant?.imageUrl && occupant?.color) {
    tileStyle.backgroundColor = occupant.color;
  }

  const handleDrop = (event) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      onDrop(row, col, JSON.parse(raw));
    } catch (error) {
      // swallow malformed drag payload
    }
  };

  return (
    <button
      type="button"
      className={classNames.join(" ")}
      onDragOver={(event) => {
        event.preventDefault();
        if (!onDragHover) return;
        const raw = event.dataTransfer.getData("application/json");
        if (!raw) {
          onDragHover(row, col, null);
          return;
        }
        try {
          onDragHover(row, col, JSON.parse(raw));
        } catch (error) {
          onDragHover(row, col, null);
        }
      }}
      onDrop={handleDrop}
      onClick={() => onClick(row, col)}
      style={tileStyle}
    >
      {pieceImageStyle && <span className="gridTile__pieceImage" style={pieceImageStyle} />}
      {skaters.length > 0 && (
        <span className="gridTile__skaters">
          {skaters.slice(0, 4).map((skater, index) => (
            <span
              key={skater.id}
              className={`gridTile__skater gridTile__skater--slot${index + 1}`}
              style={{ backgroundColor: skater.color }}
              title={skater.initials}
            >
              {skater.initials}
              {skater.trickName && <span className="gridTile__skaterTrick">{skater.trickName}</span>}
            </span>
          ))}
        </span>
      )}
    </button>
  );
};

export default Tile;
