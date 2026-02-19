import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import standalonePieces from "../../../../assets/gameContent/pieces/standalone";
import routePieces from "../../../../assets/gameContent/pieces/routes";
import { useGame } from "../../../../engine/gameContext/gameContext";
import { MODAL_BUTTONS, useModal } from "../../../../engine/ui/modal/modalContext";
import { useToast } from "../../../../engine/ui/toast/toast";
import Button, { BUTTON_VARIANT } from "../../../../engine/ui/button/button";
import { generateBeginnerSkater, randomIntInclusive, shuffleItems, SKATER_SPORT } from "../../../skaters/skaterUtils";
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
import { buildTrickAttemptsForRun } from "./sessionTrickUtils";

const SESSION_TICKS = 20;
const RUN_DURATION_MS = 2000;
const MIN_TICK_DURATION_MS = 500;
const SESSION_CLOCK_DEFAULT = {
  totalTicks: SESSION_TICKS,
  ticksRemaining: SESSION_TICKS,
  currentTick: 0,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const toNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getMiddleSpeedInvalidReason = (piece, currentSpeed) => {
  const speedCost = Math.max(0, toNumeric(piece?.speedCost) || 0);
  const maxEntranceSpeed = toNumeric(piece?.maxEntranceSpeed);

  if (currentSpeed < speedCost) {
    return `Needs at least speed ${speedCost}. Current route speed is ${currentSpeed}.`;
  }

  if (maxEntranceSpeed !== null && currentSpeed > maxEntranceSpeed) {
    return `Current route speed ${currentSpeed} exceeds max entrance speed ${maxEntranceSpeed}.`;
  }

  return null;
};

const getRouteSpeedAfterPieces = (pieces) => {
  if (!Array.isArray(pieces) || pieces.length < 1) return 0;
  const startDropSpeed = Math.max(0, toNumeric(pieces[0]?.dropSpeed) || 0);
  const middleCost = pieces
    .slice(1)
    .filter((piece) => hasRouteType(piece, "Middle"))
    .reduce((sum, piece) => sum + Math.max(0, toNumeric(piece.speedCost) || 0), 0);
  return Math.max(0, startDropSpeed - middleCost);
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getDifficultyPercent = (pieceDifficulty, coreLevel, variantLevel) =>
  Math.round((((pieceDifficulty + (coreLevel * 2) + variantLevel) * 10) / 260) * 100);

const getBaseSuccess = (trickTypeRating, attemptNumber) => {
  const rating = clamp(trickTypeRating, 1, 100) / 100;
  const attempt = clamp(attemptNumber, 1, 3);

  // Lower baseline and steeper skill curve to reduce over-landing.
  const skillComponent = 35 * Math.pow(rating, 0.75);
  const attemptBonus = (attempt - 1) * 8;
  const rng = randomIntInclusive(-6, 6);

  return clamp(Math.round(skillComponent + attemptBonus + rng), 1, 85);
};

const applyInstructorBoost = (baseSuccess, trickTypeRating, instructorTrickRating) => {
  const cappedBase = clamp(baseSuccess, 1, 100);
  const itr = clamp(instructorTrickRating || 0, 0, 10);
  if (itr <= 0) return cappedBase;
  const lowSkillFactor = Math.pow((100 - clamp(trickTypeRating, 1, 100)) / 100, 1.5);
  const maxBoost = Math.max(0, 90 - cappedBase);
  const boost = Math.round(maxBoost * lowSkillFactor * (itr / 10) * 1.2);
  return clamp(cappedBase + boost, 1, 90);
};

const getResultBand = (score) => {
  if (score > 30) return { landChance: 98, minControl: 80, maxControl: 100 };
  if (score > 20) return { landChance: 85, minControl: 60, maxControl: 90 };
  if (score > 10) return { landChance: 70, minControl: 40, maxControl: 80 };
  if (score > 0) return { landChance: 60, minControl: 30, maxControl: 70 };
  if (score > -10) return { landChance: 30, minControl: 20, maxControl: 30 };
  if (score > -20) return { landChance: 5, minControl: 1, maxControl: 20 };
  return { landChance: 0, minControl: 0, maxControl: 0 };
};

const getEffectiveTrickTypeRating = (skater, type) => {
  const raw = Number(skater?.[type] || 0);
  if (!Number.isFinite(raw)) return 1;
  const safe = Math.max(1, raw);
  if (safe <= 10) return Math.min(100, safe * 10);
  return Math.min(100, safe);
};

const getTrickSteezeScore = ({ skaterSteezeRating, pieceDifficulty, control }) => {
  const sr = clamp(Number(skaterSteezeRating) || 1, 1, 10) / 10;
  const pd = clamp(Number(pieceDifficulty) || 1, 1, 10) / 10;
  const c = clamp(Number(control) || 0, 0, 100) / 100;

  const styleBase = ((sr * 3) + pd) / 4;
  const controlMultiplier = Math.pow(c, 1.2);
  const raw = styleBase * controlMultiplier * 100;

  const variancePercent = randomIntInclusive(0, 10) / 100;
  const varianceDirection = Math.random() < 0.5 ? -1 : 1;
  const withVariance = raw + (raw * variancePercent * varianceDirection);

  return clamp(Math.round(withVariance), 1, 100);
};

const parseCoordinate = (coordinate) => {
  if (typeof coordinate !== "string" || coordinate.length < 2) return null;
  const rowChar = coordinate[0].toUpperCase();
  const colRaw = Number(coordinate.slice(1));
  if (!Number.isInteger(colRaw) || colRaw < 1) return null;
  const row = rowChar.charCodeAt(0) - 65;
  const col = colRaw - 1;
  if (row < 0) return null;
  return { row, col };
};

const parseSize = (sizeRaw) => {
  if (typeof sizeRaw !== "string") return null;
  const [rowsRaw, colsRaw] = sizeRaw.toLowerCase().split("x");
  const rows = Number(rowsRaw);
  const cols = Number(colsRaw);
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) return null;
  return { rows, cols };
};

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
  StartingSpots: instance.startingSpots,
  TrickOpportunities: instance.trickOpportunities || 0,
  Difficulty: instance.difficulty || null,
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
    StartingSpots: piece.startingSpots || 0,
    TrickOpportunities: piece.trickOpportunities || 0,
    Difficulty: piece.difficulty || null,
  })),
});

const withSessionTiming = (skater) => {
  const energy = Math.max(1, Math.min(15, skater.baseEnergy || 3));
  const latestArrivalTick = Math.max(1, SESSION_TICKS - energy);
  return {
    ...skater,
    energy,
    arrivalTick: randomIntInclusive(1, latestArrivalTick),
  };
};

const BeginnerSportModal = ({ onChoose }) => {
  return (
    <div style={{ display: "grid", gap: "0.6rem" }}>
      <p>Choose the beginner session sport.</p>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <Button variant={BUTTON_VARIANT.PRIMARY} onClick={() => onChoose(SKATER_SPORT.SKATEBOARDER)}>
          Skateboarder
        </Button>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={() => onChoose(SKATER_SPORT.ROLLERBLADER)}>
          Rollerblader
        </Button>
      </div>
    </div>
  );
};

export const useGridModel = () => {
  const { setGameValue, gameState } = useGame();
  const { openModal, closeModal } = useModal();
  const { info, warning, success } = useToast();

  const [gridSize, setGridSize] = useState(() => {
    const configured = Number(gameState?.skateparkConfig?.gridSize);
    if (Number.isInteger(configured) && configured >= MIN_GRID_SIZE && configured <= MAX_GRID_SIZE) {
      return configured;
    }
    return 3;
  });
  const [gridMode, setGridMode] = useState("edit");
  const [editMode, setEditMode] = useState("build");
  const [placedStandalone, setPlacedStandalone] = useState([]);
  const [committedRoutes, setCommittedRoutes] = useState([]);
  const [editingRoute, setEditingRoute] = useState(null);
  const [playerSkaterPool, setPlayerSkaterPool] = useState(() =>
    Array.isArray(gameState?.player?.skaterPool) ? gameState.player.skaterPool : []
  );
  const [skatepark, setSkatepark] = useState(() => (Array.isArray(gameState.skatepark) ? gameState.skatepark : []));
  const [sessionState, setSessionState] = useState({
    isActive: false,
    isTickRunning: false,
    currentTick: 0,
    maxTicks: SESSION_TICKS,
    sessionType: "normal",
    skaters: [],
    beginnerCandidates: [],
    assignments: {},
    skaterPositions: {},
    trickAttempts: [],
    currentTickTrickAttempts: [],
    recruitedSkaterIds: [],
    retryQueue: {},
    instructorTrickRating: 0,
    clock: SESSION_CLOCK_DEFAULT,
  });

  const standaloneCounterRef = useRef(1);
  const routeCounterRef = useRef(1);

  useEffect(() => {
    setGameValue("skatepark", skatepark);
  }, [setGameValue, skatepark]);

  useEffect(() => {
    setGameValue("player.skaterPool", playerSkaterPool);
  }, [playerSkaterPool, setGameValue]);

  useEffect(() => {
    setGameValue("skateparkConfig.gridSize", gridSize);
  }, [gridSize, setGameValue]);

  useEffect(() => {
    const source = Array.isArray(gameState.skatepark) ? gameState.skatepark : [];
    if (source.length < 1) {
      setPlacedStandalone([]);
      setCommittedRoutes([]);
      return;
    }

    const hydratedStandalone = [];
    const hydratedRoutes = [];
    let standaloneCount = 0;
    let routeCount = 0;

    source.forEach((entry, index) => {
      if (entry?.Type === "Standalone") {
        const topLeft = parseCoordinate(entry.Coordinates);
        const size = parseSize(entry.Size);
        if (!topLeft || !size) return;

        const template = standalonePieces.find((piece) => piece.name === entry.Name) || standalonePieces[0];
        const instanceId = entry.id || `standalone-${index + 1}`;

        hydratedStandalone.push({
          instanceId,
          pieceId: template?.id || `standalone-piece-${index + 1}`,
          name: entry.Name || template?.name || `Standalone ${index + 1}`,
          type: "Standalone",
          size,
          startingSpots: Number(entry.StartingSpots ?? template?.startingSpots ?? 0),
          marker: template?.marker || "S",
          color: template?.color || "#f97316",
          trickOpportunities: Number(entry.TrickOpportunities ?? template?.trickOpportunities ?? 0),
          difficulty: entry.Difficulty ?? template?.difficulty ?? null,
          topLeft,
          tiles: buildStandaloneTiles(topLeft.row, topLeft.col, size),
        });
        standaloneCount += 1;
        return;
      }

      if (entry?.Type === "Route" && Array.isArray(entry.Pieces)) {
        const routeId = entry.id || `route-${index + 1}`;
        const pieces = entry.Pieces.map((piece, pieceIndex) => {
          const point = parseCoordinate(piece.Coordinates);
          if (!point) return null;

          const routeType = typeof piece.RouteType === "string"
            ? piece.RouteType.split(",").map((item) => item.trim()).filter(Boolean)
            : [];
          const template = routePieces.find((routePiece) => routePiece.name === piece.Name);

          return {
            id: template?.id || `${routeId}-piece-${pieceIndex + 1}`,
            name: piece.Name || template?.name || `Route Piece ${pieceIndex + 1}`,
            type: "Route",
            routeType: routeType.length > 0 ? routeType : template?.routeType || [],
            startingSpots: Number(piece.StartingSpots ?? template?.startingSpots ?? 0),
            marker: template?.marker || "R",
            color: template?.color || "#7c3aed",
            trickOpportunities: Number(piece.TrickOpportunities ?? template?.trickOpportunities ?? 0),
            difficulty: piece.Difficulty ?? template?.difficulty ?? null,
            row: point.row,
            col: point.col,
            coordinates: piece.Coordinates,
          };
        }).filter(Boolean);

        if (pieces.length < 1) return;

        hydratedRoutes.push({
          routeId,
          name: entry.Name || `Route ${index + 1}`,
          direction: null,
          pieces,
        });
        routeCount += 1;
      }
    });

    standaloneCounterRef.current = standaloneCount + 1;
    routeCounterRef.current = routeCount + 1;
    setPlacedStandalone(hydratedStandalone);
    setCommittedRoutes(hydratedRoutes);
    setSkatepark(source);
  }, [gameState.skatepark]);

  const startingTargets = useMemo(() => {
    const targets = [];

    placedStandalone.forEach((item) => {
      targets.push({
        targetId: `standalone-target-${item.instanceId}`,
        type: "Standalone",
        sourceId: item.instanceId,
        label: `${item.name} (${toCoordinate(item.topLeft.row, item.topLeft.col)})`,
        capacity: item.startingSpots || 0,
        startCell: { row: item.topLeft.row, col: item.topLeft.col },
        runTiles: item.tiles.map((tile) => ({ row: tile.row, col: tile.col })),
        runPieces: [
          {
            name: item.name,
            coordinate: toCoordinate(item.topLeft.row, item.topLeft.col),
            trickOpportunities: item.trickOpportunities || 0,
            difficulty: item.difficulty || null,
          },
        ],
      });
    });

    committedRoutes.forEach((route) => {
      const startPiece = route.pieces[0];
      if (!startPiece || !hasRouteType(startPiece, "Start")) return;

      targets.push({
        targetId: `route-target-${route.routeId}-0`,
        type: "Route",
        sourceId: route.routeId,
        label: `${route.name} (${startPiece.name} ${startPiece.coordinates})`,
        capacity: startPiece.startingSpots || 0,
        startCell: { row: startPiece.row, col: startPiece.col },
        runTiles: route.pieces.map((routePiece) => ({ row: routePiece.row, col: routePiece.col })),
        runPieces: route.pieces.map((routePiece) => ({
          name: routePiece.name,
          coordinate: routePiece.coordinates,
          trickOpportunities: routePiece.trickOpportunities || 0,
          difficulty: routePiece.difficulty || null,
        })),
      });
    });

    return targets.filter((target) => target.capacity > 0 && target.runTiles.length > 0);
  }, [committedRoutes, placedStandalone]);

  const startingTargetById = useMemo(() => {
    const map = new Map();
    startingTargets.forEach((target) => map.set(target.targetId, target));
    return map;
  }, [startingTargets]);

  const allSkateparkRunPieces = useMemo(() => {
    const pieces = [];
    const seen = new Set();

    placedStandalone.forEach((item) => {
      const coordinate = toCoordinate(item.topLeft.row, item.topLeft.col);
      const key = `${item.name}|${coordinate}`;
      if (seen.has(key)) return;
      seen.add(key);
      pieces.push({
        name: item.name,
        coordinate,
        trickOpportunities: item.trickOpportunities || 0,
        difficulty: item.difficulty || null,
      });
    });

    committedRoutes.forEach((route) => {
      route.pieces.forEach((piece) => {
        const key = `${piece.name}|${piece.coordinates}`;
        if (seen.has(key)) return;
        seen.add(key);
        pieces.push({
          name: piece.name,
          coordinate: piece.coordinates,
          trickOpportunities: piece.trickOpportunities || 0,
          difficulty: piece.difficulty || null,
        });
      });
    });

    return pieces;
  }, [committedRoutes, placedStandalone]);

  const startingSpotsCapacity = useMemo(
    () => startingTargets.reduce((sum, target) => sum + target.capacity, 0),
    [startingTargets]
  );

  const canStartBeginnerSession = useMemo(() => {
    if (startingSpotsCapacity < 2) return false;
    if (!sessionState.isActive) {
      if (playerSkaterPool.length === 0) return true;
      return startingSpotsCapacity > playerSkaterPool.length;
    }
    return false;
  }, [playerSkaterPool.length, sessionState.isActive, startingSpotsCapacity]);

  const canStartNormalSession = useMemo(
    () => !sessionState.isActive && playerSkaterPool.length > 0,
    [playerSkaterPool.length, sessionState.isActive]
  );

  const skaterById = useMemo(() => {
    const map = new Map();
    sessionState.skaters.forEach((skater) => map.set(skater.id, skater));
    return map;
  }, [sessionState.skaters]);

  const skaterMarkers = useMemo(() => {
    const markersByTile = new Map();
    Object.entries(sessionState.skaterPositions).forEach(([skaterId, position]) => {
      const skater = skaterById.get(skaterId);
      if (!skater || !position) return;
      const key = makeTileKey(position.row, position.col);
      const list = markersByTile.get(key) || [];
      list.push({
        id: skater.id,
        initials: skater.initials,
        color: skater.color,
      });
      markersByTile.set(key, list);
    });
    return markersByTile;
  }, [sessionState.skaterPositions, skaterById]);

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

    if (gridMode === "edit" && editingRoute) {
      editingRoute.pieces.forEach((piece) => {
        map.set(makeTileKey(piece.row, piece.col), {
          kind: "editing-route",
          label: piece.marker,
          color: piece.color,
        });
      });
    }

    return map;
  }, [placedStandalone, committedRoutes, gridMode, editingRoute]);

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
        startingSpots: piece.startingSpots || 0,
        marker: piece.marker,
        color: piece.color,
        trickOpportunities: piece.trickOpportunities || 0,
        difficulty: piece.difficulty || null,
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
        currentSpeed: Math.max(0, toNumeric(piece.dropSpeed) || 0),
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
        const speedReason = getMiddleSpeedInvalidReason(piece, editingRoute.currentSpeed || 0);
        if (speedReason) {
          warning(speedReason);
          return;
        }
        const direction = getDirectionFromFirstMiddle(routePiecesList[0], { row, col });
        if (!direction) {
          warning("First middle tile must be directly north, south, east or west of the start.");
          return;
        }
        const speedCost = Math.max(0, toNumeric(piece.speedCost) || 0);
        setEditingRoute((prev) => ({
          ...prev,
          direction,
          currentSpeed: Math.max(0, (prev.currentSpeed || 0) - speedCost),
          pieces: [...prev.pieces, buildRoutePiece(piece, row, col)],
        }));
        return;
      }

      if (!hasRouteType(piece, "Middle") && !hasRouteType(piece, "End")) {
        warning("Only middle or end pieces can be used now.");
        return;
      }
      if (hasRouteType(piece, "Middle")) {
        const speedReason = getMiddleSpeedInvalidReason(piece, editingRoute.currentSpeed || 0);
        if (speedReason) {
          warning(speedReason);
          return;
        }
      }

      const expected = getNextCellByDirection(lastPiece.row, lastPiece.col, editingRoute.direction);
      if (row !== expected.row || col !== expected.col) {
        warning("Route must continue in a straight line in the current direction.");
        return;
      }

      const nextPiece = buildRoutePiece(piece, row, col);
      const isComplete = hasRouteType(piece, "End");
      const speedCost = hasRouteType(piece, "Middle") ? Math.max(0, toNumeric(piece.speedCost) || 0) : 0;
      setEditingRoute((prev) => ({
        ...prev,
        complete: isComplete,
        currentSpeed: Math.max(0, (prev.currentSpeed || 0) - speedCost),
        pieces: [...prev.pieces, nextPiece],
      }));
    },
    [editingRoute, occupancy, warning]
  );

  const onTileDrop = useCallback(
    (row, col, payload) => {
      if (gridMode !== "edit") {
        warning("Skatepark cannot be edited during session mode.");
        return;
      }
      if (editMode === "delete") {
        warning("Disable delete mode before placing pieces.");
        return;
      }

      const piece = [...standalonePieces, ...routePieces].find((item) => item.id === payload.pieceId);
      if (!piece || !inBounds(row, col, gridSize)) return;
      if (piece.type === "Route") {
        if (editingRoute?.complete) {
          warning("Route is complete. Commit it or cancel it.");
          return;
        }
        if (!editingRoute) {
          if (!hasRouteType(piece, "Start")) {
            warning("A route must begin with a start piece.");
            return;
          }
        } else if (editingRoute.pieces.length === 1) {
          if (!hasRouteType(piece, "Middle")) {
            warning("The first piece after start must be a middle piece.");
            return;
          }
          const speedReason = getMiddleSpeedInvalidReason(piece, editingRoute.currentSpeed || 0);
          if (speedReason) {
            warning(speedReason);
            return;
          }
        } else {
          if (!hasRouteType(piece, "Middle") && !hasRouteType(piece, "End")) {
            warning("Only middle or end pieces can be used now.");
            return;
          }
          if (hasRouteType(piece, "Middle")) {
            const speedReason = getMiddleSpeedInvalidReason(piece, editingRoute.currentSpeed || 0);
            if (speedReason) {
              warning(speedReason);
              return;
            }
          }
        }
      }

      if (piece.type === "Standalone") return placeStandalone(piece, row, col);
      if (!editingRoute) return startRoute(piece, row, col);
      return extendRoute(piece, row, col);
    },
    [editingRoute, editMode, extendRoute, gridMode, gridSize, placeStandalone, startRoute, warning]
  );

  const onCancelRoute = useCallback(() => {
    if (!editingRoute) return;
    setEditingRoute(null);
    info("Route cancelled.");
  }, [editingRoute, info]);

  const onRemoveLastRoutePiece = useCallback(() => {
    if (!editingRoute || editingRoute.pieces.length <= 1) return;
    setEditingRoute((prev) => {
      const nextPieces = prev.pieces.slice(0, -1);
      return {
        ...prev,
        pieces: nextPieces,
        complete: false,
        direction: nextPieces.length <= 1 ? null : prev.direction,
        currentSpeed: getRouteSpeedAfterPieces(nextPieces),
      };
    });
  }, [editingRoute]);

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
      setEditMode("build");
      success("Standalone piece removed.");
    },
    [success]
  );

  const removeRoute = useCallback(
    (routeId) => {
      setCommittedRoutes((prev) => prev.filter((route) => route.routeId !== routeId));
      setSkatepark((prev) => prev.filter((entry) => entry.id !== routeId));
      setEditMode("build");
      success("Route removed.");
    },
    [success]
  );

  const onTileClick = useCallback(
    (row, col) => {
      if (gridMode !== "edit" || editMode !== "delete") return;
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
    [closeModal, editMode, gridMode, occupancy, openModal, removeRoute, removeStandalone]
  );

  const onToggleDeleteMode = useCallback(() => {
    if (gridMode !== "edit") return warning("Delete mode is only available in Edit Skatepark mode.");
    if (editingRoute) return warning("Cancel or commit the route before entering delete mode.");
    setEditMode((prev) => (prev === "delete" ? "build" : "delete"));
  }, [editingRoute, gridMode, warning]);

  const onGridSizeChange = useCallback(
    (value) => {
      const nextSize = Number(value);
      if (!Number.isInteger(nextSize) || nextSize < MIN_GRID_SIZE || nextSize > MAX_GRID_SIZE) return;

      if (nextSize === gridSize) return;

      const allOccupiedCells = [
        ...placedStandalone.flatMap((item) => item.tiles.map((tile) => ({ row: tile.row, col: tile.col }))),
        ...committedRoutes.flatMap((route) => route.pieces.map((piece) => ({ row: piece.row, col: piece.col }))),
        ...(editingRoute ? editingRoute.pieces.map((piece) => ({ row: piece.row, col: piece.col })) : []),
      ];

      const canFitInNextSize = allOccupiedCells.every((cell) => cell.row < nextSize && cell.col < nextSize);
      if (!canFitInNextSize) {
        warning("Grid cannot be reduced to that size because some pieces would be out of bounds.");
        return;
      }

      setGridSize(nextSize);
    },
    [committedRoutes, editingRoute, gridSize, placedStandalone, warning]
  );

  const canPlaceMiddleBySpeed = useMemo(() => {
    if (!editingRoute) return false;
    if (editingRoute.pieces.length <= 1) return true;
    if (editingRoute.complete) return false;
    const currentSpeed = editingRoute.currentSpeed || 0;
    if (currentSpeed <= 0) return false;
    return routePieces.some(
      (piece) => hasRouteType(piece, "Middle") && !getMiddleSpeedInvalidReason(piece, currentSpeed)
    );
  }, [editingRoute, routePieces]);

  const getPieceDragInvalidReason = useCallback(
    (piece) => {
      if (!piece || piece.type !== "Route") return null;
      if (gridMode !== "edit") return "Skatepark cannot be edited during session mode.";
      if (editMode === "delete") return "Disable delete mode before placing pieces.";
      if (editingRoute?.complete) return "Route is complete. Commit or cancel it first.";

      if (!editingRoute) {
        return hasRouteType(piece, "Start") ? null : "A route must begin with a start piece.";
      }

      if (editingRoute.pieces.length === 1) {
        if (!hasRouteType(piece, "Middle")) return "First piece after start must be a middle piece.";
        return getMiddleSpeedInvalidReason(piece, editingRoute.currentSpeed || 0);
      }

      if (!hasRouteType(piece, "Middle") && !hasRouteType(piece, "End")) {
        return "Only middle or end pieces can be placed now.";
      }
      if (hasRouteType(piece, "Middle")) {
        return getMiddleSpeedInvalidReason(piece, editingRoute.currentSpeed || 0);
      }
      return null;
    },
    [editMode, editingRoute, gridMode]
  );

  const animateSkaterOnTarget = useCallback(async (skaterId, target) => {
    const routeTiles = target.type === "Route" ? target.runTiles : shuffleItems(target.runTiles);
    const tiles = routeTiles.length > 0 ? routeTiles : [target.startCell];
    const waitMs = RUN_DURATION_MS / Math.max(1, tiles.length);

    for (const tile of tiles) {
      setSessionState((prev) => ({
        ...prev,
        skaterPositions: {
          ...prev.skaterPositions,
          [skaterId]: { row: tile.row, col: tile.col },
        },
      }));
      await sleep(waitMs);
    }
  }, []);

  const startSessionWithSkaters = useCallback(
    (sessionType, baseSkaters) => {
      const skaters = baseSkaters.map(withSessionTiming);

      setGridMode("session");
      setEditMode("build");
      setSessionState({
        isActive: true,
        isTickRunning: false,
        currentTick: 0,
        maxTicks: SESSION_TICKS,
        sessionType,
        skaters,
        beginnerCandidates: sessionType === "beginner" ? baseSkaters : [],
        assignments: {},
        skaterPositions: {},
        trickAttempts: [],
        currentTickTrickAttempts: [],
        recruitedSkaterIds: [],
        retryQueue: {},
        instructorTrickRating: 0,
        clock: SESSION_CLOCK_DEFAULT,
      });

      success(`${sessionType === "beginner" ? "Beginner" : "Normal"} session started.`);
    },
    [success]
  );

  const onStartBeginnerSession = useCallback(() => {
    if (editingRoute) return warning("Commit or cancel the current route first.");
    if (!canStartBeginnerSession) return warning("Beginner session is not available right now.");

    openModal({
      modalTitle: "Choose Beginner Session Sport",
      buttons: MODAL_BUTTONS.NONE,
      modalContent: (
        <BeginnerSportModal
          onChoose={(sport) => {
            const count = Math.ceil(startingSpotsCapacity / 2);
            const generatedSkaters = Array.from({ length: count }, () => generateBeginnerSkater(sport));
            closeModal();
            startSessionWithSkaters("beginner", generatedSkaters);
          }}
        />
      ),
    });
  }, [
    canStartBeginnerSession,
    closeModal,
    editingRoute,
    openModal,
    startSessionWithSkaters,
    startingSpotsCapacity,
    warning,
  ]);

  const onStartNormalSession = useCallback(() => {
    if (editingRoute) return warning("Commit or cancel the current route first.");
    if (!canStartNormalSession) return warning("Add skaters to your pool before starting a normal session.");
    if (startingSpotsCapacity < 1) return warning("No starting spots are available in this skatepark.");

    const selected = shuffleItems(playerSkaterPool).slice(0, Math.min(playerSkaterPool.length, startingSpotsCapacity));
    if (selected.length < 1) return warning("No skaters can be assigned to this session.");

    startSessionWithSkaters("normal", selected);
  }, [
    canStartNormalSession,
    editingRoute,
    playerSkaterPool,
    startSessionWithSkaters,
    startingSpotsCapacity,
    warning,
  ]);

  const onGoToEditMode = useCallback(() => {
    if (sessionState.isActive) return warning("Cannot edit skatepark while a session is active.");
    setGridMode("edit");
    setEditMode("build");
    setSessionState((prev) => ({
      ...prev,
      isTickRunning: false,
      assignments: {},
      skaterPositions: {},
      retryQueue: {},
    }));
  }, [sessionState.isActive, warning]);

  const poolSpaceRemaining = useMemo(
    () => Math.max(0, startingSpotsCapacity - playerSkaterPool.length),
    [playerSkaterPool.length, startingSpotsCapacity]
  );

  const canRecruitInSession = useMemo(
    () =>
      gridMode === "session" &&
      sessionState.sessionType === "beginner" &&
      !sessionState.isActive &&
      !sessionState.isTickRunning &&
      sessionState.currentTick >= sessionState.maxTicks &&
      poolSpaceRemaining > 0,
    [
      gridMode,
      poolSpaceRemaining,
      sessionState.currentTick,
      sessionState.isActive,
      sessionState.isTickRunning,
      sessionState.maxTicks,
      sessionState.sessionType,
    ]
  );

  const canEndSession = useMemo(
    () =>
      gridMode === "session" &&
      !sessionState.isActive &&
      !sessionState.isTickRunning &&
      sessionState.currentTick >= sessionState.maxTicks,
    [gridMode, sessionState.currentTick, sessionState.isActive, sessionState.isTickRunning, sessionState.maxTicks]
  );

  const onRecruitBeginnerSkater = useCallback(
    (skaterId) => {
      if (sessionState.sessionType !== "beginner") return;
      if (poolSpaceRemaining < 1) {
        warning("No room left in your pool.");
        return;
      }
      if (sessionState.recruitedSkaterIds.includes(skaterId)) return;

      const skater = sessionState.beginnerCandidates.find((candidate) => candidate.id === skaterId);
      if (!skater) return;

      setPlayerSkaterPool((prev) => {
        if (prev.some((item) => item.id === skaterId)) return prev;
        return [...prev, skater];
      });

      setSessionState((prev) => ({
        ...prev,
        recruitedSkaterIds: [...prev.recruitedSkaterIds, skaterId],
      }));

      success(`${skater.name} added to your skater pool.`);
    },
    [poolSpaceRemaining, sessionState.beginnerCandidates, sessionState.recruitedSkaterIds, sessionState.sessionType, success, warning]
  );

  const onEndSession = useCallback(() => {
    if (!canEndSession) return warning("Session can only be ended after all ticks are complete.");
    setGridMode("edit");
    setEditMode("build");
    setSessionState({
      isActive: false,
      isTickRunning: false,
      currentTick: 0,
      maxTicks: SESSION_TICKS,
      sessionType: "normal",
      skaters: [],
      beginnerCandidates: [],
      assignments: {},
      skaterPositions: {},
      trickAttempts: [],
      currentTickTrickAttempts: [],
      recruitedSkaterIds: [],
      retryQueue: {},
      instructorTrickRating: 0,
      clock: SESSION_CLOCK_DEFAULT,
    });
    success("Session ended.");
  }, [canEndSession, success, warning]);

  const onAdvanceTick = useCallback(async () => {
    if (gridMode !== "session" || !sessionState.isActive || sessionState.isTickRunning) return;
    const nextTick = sessionState.currentTick + 1;
    if (nextTick > SESSION_TICKS) return;

    const tickStartMs = Date.now();

    const activeSkaters = sessionState.skaters.filter(
      (skater) => nextTick >= skater.arrivalTick && nextTick < skater.arrivalTick + skater.energy
    );

    const assignments = {};
    const retryQueue = { ...(sessionState.retryQueue || {}) };
    const retrySkaters = shuffleItems(activeSkaters).filter((skater) => retryQueue[skater.id]);
    const plannedAttemptsBySkater = {};
    const tickAttemptLog = [];
    const reservedSlotsByTarget = {};

    retrySkaters.forEach((skater) => {
      const retryState = retryQueue[skater.id];
      const retryTarget = startingTargetById.get(retryState?.targetId);
      if (!retryTarget) return;
      assignments[skater.id] = retryState.targetId;
      reservedSlotsByTarget[retryState.targetId] = (reservedSlotsByTarget[retryState.targetId] || 0) + 1;
    });

    const availableSlots = [];
    startingTargets.forEach((target) => {
      const reserved = reservedSlotsByTarget[target.targetId] || 0;
      const remaining = Math.max(0, target.capacity - reserved);
      for (let i = 0; i < remaining; i++) availableSlots.push(target.targetId);
    });

    const nonRetrySkaters = shuffleItems(activeSkaters).filter((skater) => !assignments[skater.id]);
    for (const skater of nonRetrySkaters) {
      if (availableSlots.length < 1) break;
      const priorResultsForSkater = [...sessionState.trickAttempts, ...tickAttemptLog].filter(
        (entry) => entry.skaterId === skater.id
      );

      const uniqueAvailableTargetIds = [...new Set(availableSlots)];
      const attemptPlanByTarget = {};
      const validTargetIds = uniqueAvailableTargetIds.filter((targetId) => {
        const target = startingTargetById.get(targetId);
        if (!target) return false;
        const attemptsPreview = buildTrickAttemptsForRun({
          skater,
          target,
          allSkateparkPieces: allSkateparkRunPieces,
          priorSessionResults: priorResultsForSkater,
        });
        attemptPlanByTarget[targetId] = attemptsPreview;
        return attemptsPreview.some((attempt) => attempt?.type && attempt?.coreName && attempt?.pieceDifficulty);
      });

      const candidateSlots =
        validTargetIds.length > 0
          ? availableSlots.filter((targetId) => validTargetIds.includes(targetId))
          : availableSlots;
      const slotIndex = randomIntInclusive(0, candidateSlots.length - 1);
      const targetId = candidateSlots[slotIndex];
      const chosenIndex = availableSlots.findIndex((slot) => slot === targetId);
      if (chosenIndex >= 0) availableSlots.splice(chosenIndex, 1);
      assignments[skater.id] = targetId;
      if (attemptPlanByTarget[targetId]) {
        plannedAttemptsBySkater[skater.id] = attemptPlanByTarget[targetId];
      }
    }

    const startPositions = {};
    Object.entries(assignments).forEach(([skaterId, targetId]) => {
      const target = startingTargetById.get(targetId);
      if (!target) return;
      startPositions[skaterId] = { row: target.startCell.row, col: target.startCell.col };
    });

    setSessionState((prev) => ({
      ...prev,
      isTickRunning: true,
      currentTick: nextTick,
      assignments,
      skaterPositions: startPositions,
      clock: {
        totalTicks: SESSION_TICKS,
        currentTick: nextTick,
        ticksRemaining: Math.max(0, SESSION_TICKS - nextTick),
      },
    }));

    const runOrder = [
      ...retrySkaters.filter((skater) => assignments[skater.id]),
      ...nonRetrySkaters.filter((skater) => assignments[skater.id]),
    ];
    for (const skater of runOrder) {
      const targetId = assignments[skater.id];
      const target = startingTargetById.get(targetId);
      if (!target) continue;
      const priorResultsForSkater = [...sessionState.trickAttempts, ...tickAttemptLog].filter(
        (entry) => entry.skaterId === skater.id
      );
      const retryState = retryQueue[skater.id];
      const attempts = retryState
        ? [
            {
              ...retryState.attempt,
              attemptNumber: retryState.attemptNumber,
            },
          ]
        : (
            plannedAttemptsBySkater[skater.id] ||
            buildTrickAttemptsForRun({
              skater,
              target,
              allSkateparkPieces: allSkateparkRunPieces,
              priorSessionResults: priorResultsForSkater,
            })
          ).map((attempt) => ({ ...attempt, attemptNumber: 1 }));

      delete retryQueue[skater.id];

      attempts.forEach((attempt) => {
        if (!attempt?.type || !attempt?.coreName || !attempt?.pieceDifficulty) {
          tickAttemptLog.push({
            id: `${nextTick}-${skater.id}-${Math.random().toString(16).slice(2, 8)}`,
            tick: nextTick,
            skaterId: skater.id,
            skaterName: skater.name,
            skaterInitials: skater.initials,
            skaterColor: skater.color,
            sport: skater.sport,
            targetLabel: target.label,
            type: attempt?.type || null,
            trickName: attempt?.trickName || "No Valid Trick Attempt",
            coreName: attempt?.coreName || null,
            coreLevel: attempt?.coreLevel || 0,
            variantName: Array.isArray(attempt?.variantNames) ? attempt.variantNames.join(" + ") : null,
            variantNames: attempt?.variantNames || [],
            variantLevel: attempt?.variantLevel || 0,
            pieceName: attempt?.pieceName || target.label,
            pieceCoordinate: attempt?.pieceCoordinate || null,
            pieceDifficulty: attempt?.pieceDifficulty || 0,
            comboKey: attempt?.comboKey || null,
            attemptNumber: attempt?.attemptNumber || 1,
            landed: false,
            control: 0,
            landChance: 0,
            difficultyScore: 0,
            successScore: 0,
            steezeScore: 1,
            resultScore: 0,
            status: "No Attempt",
            willRetry: false,
            isRepeatInSession: false,
          });
          return;
        }

        const trickTypeRating = getEffectiveTrickTypeRating(skater, attempt.type);
        const difficultyScore = clamp(
          getDifficultyPercent(attempt.pieceDifficulty, attempt.coreLevel, attempt.variantLevel),
          1,
          100
        );
        const baseSuccess = getBaseSuccess(trickTypeRating, attempt.attemptNumber || 1);
        const successScore = clamp(
          applyInstructorBoost(
            baseSuccess,
            trickTypeRating,
            sessionState.sessionType === "lesson" ? (sessionState.instructorTrickRating || 0) : 0
          ),
          1,
          100
        );
        const resultScore = successScore - difficultyScore;
        const band = getResultBand(resultScore);
        const landed = band.landChance > 0 && randomIntInclusive(1, 100) <= band.landChance;
        const control = landed ? randomIntInclusive(band.minControl, band.maxControl) : 0;
        const steezeScore = landed
          ? getTrickSteezeScore({
              skaterSteezeRating: skater.steezeRating,
              pieceDifficulty: attempt.pieceDifficulty,
              control,
            })
          : 1;

        const landedBefore = [...sessionState.trickAttempts, ...tickAttemptLog].some(
          (entry) => entry.skaterId === skater.id && entry.landed && entry.comboKey && entry.comboKey === attempt.comboKey
        );
        const isRepeatInSession = landed && landedBefore;

        const canRetry = !landed && (attempt.attemptNumber || 1) < 3;
        const willRetry = canRetry && randomIntInclusive(1, 100) <= Math.max(1, Number(skater.determination || 1));
        if (willRetry) {
          retryQueue[skater.id] = {
            targetId,
            attempt: {
              ...attempt,
            },
            attemptNumber: (attempt.attemptNumber || 1) + 1,
          };
        }

        tickAttemptLog.push({
          id: `${nextTick}-${skater.id}-${Math.random().toString(16).slice(2, 8)}`,
          tick: nextTick,
          skaterId: skater.id,
          skaterName: skater.name,
          skaterInitials: skater.initials,
          skaterColor: skater.color,
          sport: skater.sport,
          targetLabel: target.label,
          type: attempt.type,
          trickName: attempt.trickName,
          coreName: attempt.coreName,
          coreLevel: attempt.coreLevel,
          variantName: attempt.variantNames.length > 0 ? attempt.variantNames.join(" + ") : null,
          variantNames: attempt.variantNames,
          variantLevel: attempt.variantLevel,
          pieceName: attempt.pieceName,
          pieceCoordinate: attempt.pieceCoordinate,
          pieceDifficulty: attempt.pieceDifficulty,
          comboKey: attempt.comboKey,
          attemptNumber: attempt.attemptNumber || 1,
          trickTypeRating,
          landed,
          control,
          landChance: band.landChance,
          difficultyScore,
          successScore,
          steezeScore,
          resultScore,
          status: landed ? "Landed" : "Bailed",
          willRetry,
          isRepeatInSession,
        });
      });
      await animateSkaterOnTarget(skater.id, target);
    }

    const elapsedMs = Date.now() - tickStartMs;
    if (elapsedMs < MIN_TICK_DURATION_MS) {
      await sleep(MIN_TICK_DURATION_MS - elapsedMs);
    }

    const sessionEnded = nextTick >= SESSION_TICKS;
    setSessionState((prev) => ({
      ...prev,
      isTickRunning: false,
      isActive: sessionEnded ? false : prev.isActive,
      assignments: sessionEnded ? {} : prev.assignments,
      skaterPositions: sessionEnded ? {} : prev.skaterPositions,
      trickAttempts: [...prev.trickAttempts, ...tickAttemptLog],
      currentTickTrickAttempts: tickAttemptLog,
      retryQueue: sessionEnded ? {} : retryQueue,
    }));

    if (sessionEnded) success("Session ended after 20 ticks.");
  }, [
    animateSkaterOnTarget,
    gridMode,
    sessionState,
    allSkateparkRunPieces,
    startingTargetById,
    startingTargets,
    success,
  ]);

  useEffect(() => {
    if (gridMode !== "session") return;
    if (!sessionState.isActive || sessionState.isTickRunning) return;
    if (sessionState.currentTick >= sessionState.maxTicks) return;

    onAdvanceTick();
  }, [
    gridMode,
    onAdvanceTick,
    sessionState.currentTick,
    sessionState.isActive,
    sessionState.isTickRunning,
    sessionState.maxTicks,
  ]);

  const sessionTimeline = useMemo(() => {
    return [...sessionState.skaters]
      .sort((a, b) => a.arrivalTick - b.arrivalTick)
      .map((skater) => ({
        id: skater.id,
        name: skater.name,
        initials: skater.initials,
        arrivalTick: skater.arrivalTick,
        energy: skater.energy,
        leaveTick: skater.arrivalTick + skater.energy - 1,
      }));
  }, [sessionState.skaters]);

  const sessionRunDisplay = useMemo(() => {
    if (sessionState.currentTick < 1) return [];

    return sessionState.skaters
      .filter(
        (skater) =>
          sessionState.currentTick >= skater.arrivalTick &&
          sessionState.currentTick < skater.arrivalTick + skater.energy
      )
      .map((skater) => {
        const assignedTargetId = sessionState.assignments[skater.id];
        const target = assignedTargetId ? startingTargetById.get(assignedTargetId) : null;
        const energyLeft = Math.max(0, skater.arrivalTick + skater.energy - sessionState.currentTick);
        return {
          id: skater.id,
          name: skater.name,
          initials: skater.initials,
          color: skater.color,
          startingOn: target ? target.label : "No start chosen this tick",
          energyLeft,
        };
      });
  }, [sessionState.assignments, sessionState.currentTick, sessionState.skaters, startingTargetById]);

  const sessionAttemptLog = useMemo(() => {
    return [...sessionState.trickAttempts].sort((a, b) => a.tick - b.tick);
  }, [sessionState.trickAttempts]);

  return {
    gridSize,
    gridMode,
    editMode,
    editingRoute,
    canPlaceMiddleBySpeed,
    getPieceDragInvalidReason,
    skatepark,
    occupancy,
    skaterMarkers,
    standalonePieces,
    routePieces,
    sessionState,
    sessionTimeline,
    sessionRunDisplay,
    sessionAttemptLog,
    playerSkaterPool,
    canStartBeginnerSession,
    canStartNormalSession,
    canEndSession,
    canRecruitInSession,
    poolSpaceRemaining,
    startingSpotsCapacity,
    onTileDrop,
    onTileClick,
    onCancelRoute,
    onRemoveLastRoutePiece,
    onCommitRoute,
    onToggleDeleteMode,
    onGridSizeChange,
    onStartBeginnerSession,
    onStartNormalSession,
    onRecruitBeginnerSkater,
    onEndSession,
    onGoToEditMode,
  };
};
