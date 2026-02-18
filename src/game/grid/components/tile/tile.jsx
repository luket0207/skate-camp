import React from "react";
import "./tile.scss";

const Tile = ({ row, col, occupant, onDrop, onClick }) => {
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
    </button>
  );
};

export default Tile;
