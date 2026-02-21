import React from "react";
import Controls from "./components/controls/controls";
import PiecePalette from "./components/piecePalette/piecePalette";
import SessionPanel from "./components/sessionPanel/sessionPanel";
import Board from "./components/board/board";
import { useGridModel } from "./components/hooks/useGridModel";
import "./skatepark.scss";

const Skatepark = () => {
  const model = useGridModel();

  return (
    <div className="skatepark">
      <h1>Skatepark Builder</h1>

      <div className="skatepark__layout">
        <div className="skatepark__leftCol">
          <div className="skatepark__boardWrap">
            <Board
              gridSize={model.gridSize}
              occupancy={model.occupancy}
              skaterMarkers={model.skaterMarkers}
              editingRoute={model.editingRoute}
              onCancelRoute={model.onCancelRoute}
              onCommitRoute={model.onCommitRoute}
              onRemoveLastRoutePiece={model.onRemoveLastRoutePiece}
              onTileDrop={model.onTileDrop}
              onTileClick={model.onTileClick}
            />
          </div>

          {model.gridMode === "edit" && (
            <div className="skatepark__paletteWrap">
          <PiecePalette
            standalonePieces={model.standalonePieces}
            routePieces={model.routePieces}
            editingRoute={model.editingRoute}
            canPlaceMiddleBySpeed={model.canPlaceMiddleBySpeed}
            getPieceDragInvalidReason={model.getPieceDragInvalidReason}
            routeModeActive={Boolean(model.editingRoute)}
          />
            </div>
          )}

          {model.gridMode === "session" && (
            <div className="skatepark__paletteWrap">
              <SessionPanel
                sessionState={model.sessionState}
                timeline={model.sessionTimeline}
                runDisplay={model.sessionRunDisplay}
                attemptLog={model.sessionAttemptLog}
                canRecruitSkaters={model.canRecruitInSession}
                poolSpaceRemaining={model.poolSpaceRemaining}
                onRecruitSkater={model.onRecruitBeginnerSkater}
              />
            </div>
          )}

          <div className="skatepark__debug">
            <h3>Debug: gameContext.skatepark</h3>
            <pre>{JSON.stringify(model.skatepark, null, 2)}</pre>
          </div>
        </div>

        <div className="skatepark__rightCol">
          <Controls
            gridSize={model.gridSize}
            gridMode={model.gridMode}
            editMode={model.editMode}
            sessionState={model.sessionState}
            canStartBeginnerSession={model.canStartBeginnerSession}
            canStartNormalSession={model.canStartNormalSession}
            canEndSession={model.canEndSession}
            playerSkaterPoolCount={model.playerSkaterPool.length}
            startingSpotsCapacity={model.startingSpotsCapacity}
            onGridSizeChange={model.onGridSizeChange}
            onToggleDeleteMode={model.onToggleDeleteMode}
            onStartBeginnerSession={model.onStartBeginnerSession}
            onStartNormalSession={model.onStartNormalSession}
            onEndSession={model.onEndSession}
          />
        </div>
      </div>
    </div>
  );
};

export default Skatepark;
