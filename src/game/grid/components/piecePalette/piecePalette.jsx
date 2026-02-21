import React, { useEffect, useMemo, useState } from "react";
import "./piecePalette.scss";
import { getPieceImageUrl } from "../hooks/pieceImageUtils";

const renderRouteType = (routeType) => routeType.join(", ");
const asDisplay = (value) => (value === null || value === undefined ? "N/A" : value);
const clampToTen = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(10, parsed));
};
const shortType = (type) => (type === "bigAir" ? "Air" : type.charAt(0).toUpperCase() + type.slice(1, 3));
const getSkateboardDifficulty = (piece, type) => {
  const data = piece.difficulty?.skateboarder || {};
  if (type === "tech") return data.tech ?? data.flip ?? null;
  if (type === "spin") return data.spin ?? data.grab ?? null;
  return data[type] ?? null;
};

const DifficultyMeter = ({ label, value }) => {
  const safe = clampToTen(value);
  if (safe === null) {
    return (
      <div className="pieceItem__meter">
        <span className="pieceItem__meterLabel">{label}</span>
        <span className="pieceItem__meterNA">-</span>
      </div>
    );
  }

  return (
    <div className="pieceItem__meter">
      <span className="pieceItem__meterLabel">{label}</span>
      <span className="pieceItem__meterBar" aria-hidden="true">
        <span className="pieceItem__meterFill" style={{ width: `${safe * 10}%` }} />
      </span>
      <span className="pieceItem__meterValue">{safe}</span>
    </div>
  );
};

const createDragPreview = (piece, tileSizePx, imageUrl) => {
  const rows = Math.max(1, Number(piece?.size?.rows) || 1);
  const cols = Math.max(1, Number(piece?.size?.cols) || 1);
  const gapPx = 3;
  const preview = document.createElement("div");
  preview.style.position = "fixed";
  preview.style.left = "-9999px";
  preview.style.top = "-9999px";
  preview.style.pointerEvents = "none";
  preview.style.display = "grid";
  preview.style.gridTemplateColumns = `repeat(${cols}, ${tileSizePx}px)`;
  preview.style.gap = `${gapPx}px`;
  preview.style.padding = "0";
  preview.style.background = "transparent";
  preview.style.borderRadius = "10px";
  preview.style.opacity = "0.82";

  const tileCount = rows * cols;
  for (let i = 0; i < tileCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const tile = document.createElement("div");
    tile.style.width = `${tileSizePx}px`;
    tile.style.height = `${tileSizePx}px`;
    tile.style.backgroundColor = piece.color || "#6b7280";
    if (imageUrl) {
      tile.style.backgroundImage = `url("${imageUrl}")`;
      tile.style.backgroundRepeat = "no-repeat";
      tile.style.backgroundSize =
        `${(cols * tileSizePx) + ((cols - 1) * gapPx)}px ${(rows * tileSizePx) + ((rows - 1) * gapPx)}px`;
      tile.style.backgroundPosition = `${-(col * (tileSizePx + gapPx))}px ${-(row * (tileSizePx + gapPx))}px`;
    }
    tile.style.border = "1px solid rgba(255,255,255,0.65)";
    tile.style.borderRadius = "8px";
    tile.style.boxSizing = "border-box";
    preview.appendChild(tile);
  }

  return preview;
};

const onPieceDragStart = (event, piece) => {
  event.dataTransfer.setData("application/json", JSON.stringify({ pieceId: piece.id }));

  const tileSizePx = Math.max(1, Math.round(event.currentTarget.getBoundingClientRect().width || 40));
  const preview = createDragPreview(piece, tileSizePx, getPieceImageUrl(piece));
  document.body.appendChild(preview);

  event.dataTransfer.setDragImage(preview, tileSizePx / 2, tileSizePx / 2);

  const cleanup = () => {
    preview.remove();
    event.currentTarget.removeEventListener("dragend", cleanup);
  };

  event.currentTarget.addEventListener("dragend", cleanup);
};

const PieceCard = ({ piece, isDragging, dragInvalidReason, onDragStart, onDragEnd }) => {
  const pieceImageUrl = getPieceImageUrl(piece);
  return (
    <div className="pieceItem">
    <button
      type="button"
      className={`pieceCard${isDragging ? " pieceCard--dragging" : ""}${isDragging && dragInvalidReason ? " pieceCard--invalid" : ""}`}
      title={piece.name}
      draggable
      onDragStart={(event) => {
        onPieceDragStart(event, piece);
        onDragStart(piece.id);
      }}
      onDragEnd={onDragEnd}
      style={{
        backgroundColor: piece.color,
        backgroundImage: pieceImageUrl ? `url("${pieceImageUrl}")` : undefined,
      }}
    >
    </button>

    <div className="pieceItem__meta">
      {piece.type === "Standalone"
        ? `${piece.size.rows}x${piece.size.cols} | Spots ${piece.startingSpots || 0}`
        : `${renderRouteType(piece.routeType)} | Spots ${piece.startingSpots || 0}`}
    </div>
    <div className="pieceItem__name">{piece.name}</div>
    <div className="pieceItem__chips">
      <span className="pieceItem__chip">Cost {asDisplay(piece.cost)}</span>
      <span className="pieceItem__chip">Ops {asDisplay(piece.trickOpportunities)}</span>
      <span className="pieceItem__chip">Spots {asDisplay(piece.startingSpots)}</span>
      {piece.type === "Standalone" && <span className="pieceItem__chip">Size {piece.size.rows}x{piece.size.cols}</span>}
      {piece.type === "Route" && <span className="pieceItem__chip">Type {renderRouteType(piece.routeType)}</span>}
      {piece.type === "Route" && <span className="pieceItem__chip">Drop {asDisplay(piece.dropSpeed)}</span>}
      {piece.type === "Route" && <span className="pieceItem__chip">Cost {asDisplay(piece.speedCost)}</span>}
      {piece.type === "Route" && <span className="pieceItem__chip">Max {asDisplay(piece.maxEntranceSpeed)}</span>}
    </div>

    <div className="pieceItem__difficulty">
      <div className="pieceItem__difficultyBlock">
        <div className="pieceItem__difficultyTitle">RB</div>
        {["stall", "grind", "tech", "spin", "bigAir"].map((type) => (
          <DifficultyMeter key={`rb-${type}`} label={shortType(type)} value={piece.difficulty?.rollerblader?.[type]} />
        ))}
      </div>
      <div className="pieceItem__difficultyBlock">
        <div className="pieceItem__difficultyTitle">SB</div>
        {["stall", "grind", "tech", "spin", "bigAir"].map((type) => (
          <DifficultyMeter key={`sb-${type}`} label={shortType(type)} value={getSkateboardDifficulty(piece, type)} />
        ))}
      </div>
    </div>
    {isDragging && dragInvalidReason && <div className="pieceItem__error">{dragInvalidReason}</div>}
  </div>
  );
};

const PiecePalette = ({
  standalonePieces,
  routePieces,
  editingRoute,
  canPlaceMiddleBySpeed,
  getPieceDragInvalidReason,
  routeModeActive,
}) => {
  const [activeTab, setActiveTab] = useState("Standalone");
  const [draggingPieceId, setDraggingPieceId] = useState(null);

  const tabs = ["Standalone", "Start", "Middle", "End"];

  const enabledTabs = useMemo(() => {
    if (!editingRoute) {
      return new Set(["Standalone", "Start"]);
    }

    const routeLength = editingRoute.pieces?.length || 0;

    if (routeLength <= 1) {
      return new Set(["Middle"]);
    }

    if (!canPlaceMiddleBySpeed) {
      return new Set(["End"]);
    }

    return new Set(["Middle", "End"]);
  }, [canPlaceMiddleBySpeed, editingRoute]);

  useEffect(() => {
    if (!editingRoute) {
      if (!enabledTabs.has(activeTab)) {
        setActiveTab("Standalone");
      }
      return;
    }

    const routeLength = editingRoute.pieces?.length || 0;

    if (routeLength <= 1) {
      if (activeTab !== "Middle") {
        setActiveTab("Middle");
      }
      return;
    }

    if (!enabledTabs.has(activeTab)) {
      if (routeLength > 1 && enabledTabs.has("End") && !enabledTabs.has("Middle")) {
        setActiveTab("End");
        return;
      }
      setActiveTab("Middle");
    }
  }, [activeTab, editingRoute, enabledTabs]);

  const visiblePieces = useMemo(() => {
    if (activeTab === "Standalone") return standalonePieces;
    return routePieces.filter((piece) => Array.isArray(piece.routeType) && piece.routeType.includes(activeTab));
  }, [activeTab, routePieces, standalonePieces]);

  return (
    <aside className="piecePalette">
      <h3>Piece Palette</h3>
      <p>Drag pieces onto the grid.</p>

      <div className="piecePalette__tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`piecePalette__tab${activeTab === tab ? " piecePalette__tab--active" : ""}`}
            onClick={() => {
              if (!enabledTabs.has(tab)) return;
              setActiveTab(tab);
            }}
            disabled={!enabledTabs.has(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <h4>
        {activeTab} Pieces {routeModeActive && activeTab !== "Standalone" ? "(Route Mode Active)" : ""}
      </h4>
      <div className="piecePalette__list piecePalette__list--row">
        {visiblePieces.map((piece) => (
          <PieceCard
            key={piece.id}
            piece={piece}
            isDragging={draggingPieceId === piece.id}
            dragInvalidReason={getPieceDragInvalidReason ? getPieceDragInvalidReason(piece) : null}
            onDragStart={setDraggingPieceId}
            onDragEnd={() => setDraggingPieceId(null)}
          />
        ))}
      </div>
    </aside>
  );
};

export default PiecePalette;
