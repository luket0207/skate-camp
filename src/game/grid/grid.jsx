import React from "react";
import Controls from "./components/controls/controls";
import PiecePalette from "./components/piecePalette/piecePalette";
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
            onTileDrop={model.onTileDrop}
            onTileClick={model.onTileClick}
          />
        </div>

        <div className="gridScene__controlsWrap">
          <Controls
            gridSize={model.gridSize}
            mode={model.mode}
            editingRoute={model.editingRoute}
            onGridSizeChange={model.onGridSizeChange}
            onToggleDeleteMode={model.onToggleDeleteMode}
            onCancelRoute={model.onCancelRoute}
            onCommitRoute={model.onCommitRoute}
          />
        </div>
      </div>

      <div className="gridScene__paletteWrap">
        <PiecePalette
          standalonePieces={model.standalonePieces}
          routePieces={model.routePieces}
          routeModeActive={Boolean(model.editingRoute)}
        />
      </div>

      <div className="gridScene__debug">
        <h3>Debug: gameContext.skatepark</h3>
        <pre>{JSON.stringify(model.skatepark, null, 2)}</pre>
      </div>
    </div>
  );
};

export default Grid;
