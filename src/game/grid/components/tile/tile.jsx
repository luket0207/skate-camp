import React from "react";
import "./tile.scss";

const Tile = ({ row, col, occupant, skaters, onDrop, onClick }) => {
  const classNames = ["gridTile"];

  if (occupant) classNames.push("gridTile--occupied");
  if (occupant?.kind === "editing-route") classNames.push("gridTile--editingRoute");

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
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onClick={() => onClick(row, col)}
      style={{ backgroundColor: occupant?.color || undefined }}
    >
      {occupant?.label && (occupant.isOrigin || occupant.kind !== "standalone") ? occupant.label : ""}

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
            </span>
          ))}
        </span>
      )}
    </button>
  );
};

export default Tile;
