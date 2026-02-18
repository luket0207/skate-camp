export const MIN_GRID_SIZE = 3;
export const MAX_GRID_SIZE = 10;

export const makeTileKey = (row, col) => `${row}-${col}`;

export const toCoordinate = (row, col) => `${String.fromCharCode(65 + row)}${col + 1}`;

export const buildStandaloneTiles = (topRow, leftCol, size) => {
  const tiles = [];
  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      tiles.push({ row: topRow + r, col: leftCol + c });
    }
  }
  return tiles;
};

export const inBounds = (row, col, gridSize) => row >= 0 && col >= 0 && row < gridSize && col < gridSize;

export const canPlaceStandalone = (topRow, leftCol, size, gridSize, occupancy) => {
  const tiles = buildStandaloneTiles(topRow, leftCol, size);
  return tiles.every((tile) => inBounds(tile.row, tile.col, gridSize) && !occupancy.has(makeTileKey(tile.row, tile.col)));
};

export const hasRouteType = (piece, type) => Array.isArray(piece.routeType) && piece.routeType.includes(type);

export const getDirectionFromFirstMiddle = (start, firstMiddle) => {
  const rowDelta = firstMiddle.row - start.row;
  const colDelta = firstMiddle.col - start.col;

  if (rowDelta === -1 && colDelta === 0) return "north";
  if (rowDelta === 1 && colDelta === 0) return "south";
  if (rowDelta === 0 && colDelta === 1) return "east";
  if (rowDelta === 0 && colDelta === -1) return "west";
  return null;
};

export const getNextCellByDirection = (row, col, direction) => {
  if (direction === "north") return { row: row - 1, col };
  if (direction === "south") return { row: row + 1, col };
  if (direction === "east") return { row, col: col + 1 };
  return { row, col: col - 1 };
};
