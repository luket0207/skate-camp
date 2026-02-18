import React from "react";
import Controls from "./components/controls/controls";
import PiecePalette from "./components/piecePalette/piecePalette";
import SessionPanel from "./components/sessionPanel/sessionPanel";
import Board from "./components/board/board";
import { useGridModel } from "./components/hooks/useGridModel";
import "./grid.scss";

const Grid = () => {
  const model = useGridModel();

  return (
    <div className="gridScene">
      <h1>Skatepark Builder</h1>

      <div className="gridScene__topRow">
        <div className="gridScene__boardWrap">
          <Board
            gridSize={model.gridSize}
            occupancy={model.occupancy}
            skaterMarkers={model.skaterMarkers}
            onTileDrop={model.onTileDrop}
            onTileClick={model.onTileClick}
          />
        </div>

        <div className="gridScene__controlsWrap">
          <Controls
            gridSize={model.gridSize}
            gridMode={model.gridMode}
            editMode={model.editMode}
            editingRoute={model.editingRoute}
            sessionState={model.sessionState}
            beginnerSport={model.beginnerSport}
            canStartBeginnerSession={model.canStartBeginnerSession}
            canStartNormalSession={model.canStartNormalSession}
            playerSkaterPoolCount={model.playerSkaterPool.length}
            startingSpotsCapacity={model.startingSpotsCapacity}
            onGridSizeChange={model.onGridSizeChange}
            onToggleDeleteMode={model.onToggleDeleteMode}
            onCancelRoute={model.onCancelRoute}
            onCommitRoute={model.onCommitRoute}
            onStartBeginnerSession={model.onStartBeginnerSession}
            onStartNormalSession={model.onStartNormalSession}
            onGoToEditMode={model.onGoToEditMode}
            onAdvanceTick={model.onAdvanceTick}
            onBeginnerSportChange={model.onBeginnerSportChange}
          />
        </div>
      </div>

      {model.gridMode === "edit" && (
        <div className="gridScene__paletteWrap">
          <PiecePalette
            standalonePieces={model.standalonePieces}
            routePieces={model.routePieces}
            routeModeActive={Boolean(model.editingRoute)}
          />
        </div>
      )}

      {model.gridMode === "session" && (
        <div className="gridScene__paletteWrap">
          <SessionPanel
            sessionState={model.sessionState}
            timeline={model.sessionTimeline}
            runDisplay={model.sessionRunDisplay}
          />
        </div>
      )}

      <div className="gridScene__debug">
        <h3>Debug: gameContext.skatepark</h3>
        <pre>{JSON.stringify(model.skatepark, null, 2)}</pre>
      </div>
    </div>
  );
};

export default Grid;
