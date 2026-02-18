import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import standalonePieces from "../../../../assets/gameContent/pieces/standalone";
import routePieces from "../../../../assets/gameContent/pieces/routes";
import { useGame } from "../../../../engine/gameContext/gameContext";
import { MODAL_BUTTONS, useModal } from "../../../../engine/ui/modal/modalContext";
import { useToast } from "../../../../engine/ui/toast/toast";
import {
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  buildStandaloneTiles,
  canPlaceStandalone,
  getDirectionFromFirstMiddle,
  getNextCellByDirection,
  hasRouteType,
  inBounds,
  makeTileKey,
  toCoordinate,
} from "./gridUtils";

const buildRoutePiece = (piece, row, col) => ({
  ...piece,
  row,
  col,
  coordinates: toCoordinate(row, col),
});

const makeStandaloneSkateparkEntry = (instance) => ({
  id: instance.instanceId,
  Name: instance.name,
  Type: "Standalone",
  Size: `${instance.size.rows}x${instance.size.cols}`,
  Coordinates: toCoordinate(instance.topLeft.row, instance.topLeft.col),
});

const makeRouteSkateparkEntry = (route) => ({
  id: route.routeId,
  Name: route.name,
  Type: "Route",
  Pieces: route.pieces.map((piece) => ({
    Name: piece.name,
    Type: "Route",
    RouteType: piece.routeType.join(", "),
    Coordinates: piece.coordinates,
  })),
});

export const useGridModel = () => {
  const { setGameValue, gameState } = useGame();
  const { openModal, closeModal } = useModal();
  const { info, warning, success } = useToast();

  const [gridSize, setGridSize] = useState(6);
  const [mode, setMode] = useState("build");
  const [placedStandalone, setPlacedStandalone] = useState([]);
  const [committedRoutes, setCommittedRoutes] = useState([]);
  const [editingRoute, setEditingRoute] = useState(null);
  const [skatepark, setSkatepark] = useState(() => (Array.isArray(gameState.skatepark) ? gameState.skatepark : []));

  const standaloneCounterRef = useRef(1);
  const routeCounterRef = useRef(1);

  useEffect(() => {
    setGameValue("skatepark", skatepark);
  }, [setGameValue, skatepark]);

  const occupancy = useMemo(() => {
    const map = new Map();

    placedStandalone.forEach((item) => {
      item.tiles.forEach((tile) => {
        map.set(makeTileKey(tile.row, tile.col), {
          kind: "standalone",
          instanceId: item.instanceId,
          label: item.marker,
          color: item.color,
          isOrigin: tile.row === item.topLeft.row && tile.col === item.topLeft.col,
        });
      });
    });

    committedRoutes.forEach((route) => {
      route.pieces.forEach((piece, pieceIndex) => {
        map.set(makeTileKey(piece.row, piece.col), {
          kind: "route",
          routeId: route.routeId,
          pieceIndex,
          label: piece.marker,
          color: piece.color,
        });
      });
    });

    if (editingRoute) {
      editingRoute.pieces.forEach((piece) => {
        map.set(makeTileKey(piece.row, piece.col), {
          kind: "editing-route",
          label: piece.marker,
          color: piece.color,
        });
      });
    }

    return map;
  }, [placedStandalone, committedRoutes, editingRoute]);

  const placeStandalone = useCallback(
    (piece, row, col) => {
      if (editingRoute) {
        warning("Finish or cancel the current route first.");
        return;
      }

      if (!canPlaceStandalone(row, col, piece.size, gridSize, occupancy)) {
        warning("This standalone piece cannot be placed there.");
        return;
      }

      const tiles = buildStandaloneTiles(row, col, piece.size);
      const instance = {
        instanceId: `standalone-${standaloneCounterRef.current++}`,
        pieceId: piece.id,
        name: piece.name,
        type: piece.type,
        size: piece.size,
        marker: piece.marker,
        color: piece.color,
        topLeft: { row, col },
        tiles,
      };

      setPlacedStandalone((prev) => [...prev, instance]);
      setSkatepark((prev) => [...prev, makeStandaloneSkateparkEntry(instance)]);
      success(`Placed ${piece.name}`);
    },
    [editingRoute, gridSize, occupancy, success, warning]
  );

  const startRoute = useCallback(
    (piece, row, col) => {
      if (!hasRouteType(piece, "Start")) {
        warning("A route must begin with a start piece.");
        return;
      }

      if (occupancy.has(makeTileKey(row, col))) {
        warning("That tile is already occupied.");
        return;
      }

      setEditingRoute({
        pieces: [buildRoutePiece(piece, row, col)],
        direction: null,
        complete: false,
      });
      info("Route mode started. Place a middle piece next to the start.");
    },
    [info, occupancy, warning]
  );

  const extendRoute = useCallback(
    (piece, row, col) => {
      if (!editingRoute) return;

      if (editingRoute.complete) {
        warning("This route is complete. Commit it or cancel it.");
        return;
      }

      if (occupancy.has(makeTileKey(row, col))) {
        warning("That tile is already occupied.");
        return;
      }

      const routePiecesList = editingRoute.pieces;
      const lastPiece = routePiecesList[routePiecesList.length - 1];

      if (routePiecesList.length === 1) {
        if (!hasRouteType(piece, "Middle")) {
          warning("The first piece after start must be a middle piece.");
          return;
        }

        const direction = getDirectionFromFirstMiddle(routePiecesList[0], { row, col });
        if (!direction) {
          warning("First middle tile must be directly north, south, east or west of the start.");
          return;
        }

        setEditingRoute((prev) => ({
          ...prev,
          direction,
          pieces: [...prev.pieces, buildRoutePiece(piece, row, col)],
        }));
        return;
      }

      if (!hasRouteType(piece, "Middle") && !hasRouteType(piece, "End")) {
        warning("Only middle or end pieces can be used now.");
        return;
      }

      const expected = getNextCellByDirection(lastPiece.row, lastPiece.col, editingRoute.direction);
      if (row !== expected.row || col !== expected.col) {
        warning("Route must continue in a straight line in the current direction.");
        return;
      }

      const nextPiece = buildRoutePiece(piece, row, col);
      const isComplete = hasRouteType(piece, "End");

      setEditingRoute((prev) => ({
        ...prev,
        complete: isComplete,
        pieces: [...prev.pieces, nextPiece],
      }));
    },
    [editingRoute, occupancy, warning]
  );

  const onTileDrop = useCallback(
    (row, col, payload) => {
      if (mode === "delete") {
        warning("Disable delete mode before placing pieces.");
        return;
      }

      const piece = [...standalonePieces, ...routePieces].find((item) => item.id === payload.pieceId);
      if (!piece) return;

      if (!inBounds(row, col, gridSize)) return;

      if (piece.type === "Standalone") {
        placeStandalone(piece, row, col);
        return;
      }

      if (!editingRoute) {
        startRoute(piece, row, col);
        return;
      }

      extendRoute(piece, row, col);
    },
    [editingRoute, extendRoute, gridSize, mode, placeStandalone, startRoute, warning]
  );

  const onCancelRoute = useCallback(() => {
    if (!editingRoute) return;
    setEditingRoute(null);
    info("Route cancelled.");
  }, [editingRoute, info]);

  const onCommitRoute = useCallback(() => {
    if (!editingRoute || !editingRoute.complete) {
      warning("Route is incomplete. Add an end piece to commit.");
      return;
    }

    const route = {
      routeId: `route-${routeCounterRef.current++}`,
      name: `Route ${routeCounterRef.current - 1}`,
      direction: editingRoute.direction,
      pieces: editingRoute.pieces,
    };

    setCommittedRoutes((prev) => [...prev, route]);
    setSkatepark((prev) => [...prev, makeRouteSkateparkEntry(route)]);
    setEditingRoute(null);
    success("Route committed to the skatepark.");
  }, [editingRoute, success, warning]);

  const removeStandalone = useCallback(
    (instanceId) => {
      setPlacedStandalone((prev) => prev.filter((item) => item.instanceId !== instanceId));
      setSkatepark((prev) => prev.filter((entry) => entry.id !== instanceId));
      setMode("build");
      success("Standalone piece removed.");
    },
    [success]
  );

  const removeRoute = useCallback(
    (routeId) => {
      setCommittedRoutes((prev) => prev.filter((route) => route.routeId !== routeId));
      setSkatepark((prev) => prev.filter((entry) => entry.id !== routeId));
      setMode("build");
      success("Route removed.");
    },
    [success]
  );

  const onTileClick = useCallback(
    (row, col) => {
      if (mode !== "delete") return;

      const item = occupancy.get(makeTileKey(row, col));
      if (!item) return;

      if (item.kind === "standalone") {
        openModal({
          modalTitle: "Delete standalone piece?",
          modalContent: "This will remove this standalone piece from the skatepark.",
          buttons: MODAL_BUTTONS.YES_NO,
          onYes: () => {
            removeStandalone(item.instanceId);
            closeModal();
          },
          onNo: closeModal,
        });
      }

      if (item.kind === "route") {
        openModal({
          modalTitle: "Delete route?",
          modalContent: "This will remove the whole route from the skatepark.",
          buttons: MODAL_BUTTONS.YES_NO,
          onYes: () => {
            removeRoute(item.routeId);
            closeModal();
          },
          onNo: closeModal,
        });
      }
    },
    [closeModal, mode, occupancy, openModal, removeRoute, removeStandalone]
  );

  const onToggleDeleteMode = useCallback(() => {
    if (editingRoute) {
      warning("Cancel or commit the route before entering delete mode.");
      return;
    }
    setMode((prev) => (prev === "delete" ? "build" : "delete"));
  }, [editingRoute, warning]);

  const onGridSizeChange = useCallback(
    (value) => {
      const nextSize = Number(value);
      if (!Number.isInteger(nextSize) || nextSize < MIN_GRID_SIZE || nextSize > MAX_GRID_SIZE) return;

      const hasPlacedPieces = placedStandalone.length > 0 || committedRoutes.length > 0 || Boolean(editingRoute);
      if (hasPlacedPieces) {
        warning("Grid size cannot change after pieces are placed.");
        return;
      }

      setGridSize(nextSize);
    },
    [committedRoutes.length, editingRoute, placedStandalone.length, warning]
  );

  return {
    gridSize,
    mode,
    editingRoute,
    occupancy,
    skatepark,
    standalonePieces,
    routePieces,
    onTileDrop,
    onTileClick,
    onCancelRoute,
    onCommitRoute,
    onToggleDeleteMode,
    onGridSizeChange,
  };
};
