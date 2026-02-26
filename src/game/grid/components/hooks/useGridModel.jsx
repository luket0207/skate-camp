import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import standalonePieces from "../../../../assets/gameContent/pieces/standalone";
import routePieces from "../../../../assets/gameContent/pieces/routes";
import { useGame } from "../../../../engine/gameContext/gameContext";
import { MODAL_BUTTONS, useModal } from "../../../../engine/ui/modal/modalContext";
import { useToast } from "../../../../engine/ui/toast/toast";
import {
  generateBeginnerSkater,
  generateMediumSkater,
  generateProSkater,
  randomIntInclusive,
  shuffleItems,
  SKATER_SPORT,
} from "../../../skaters/skaterUtils";
import { TRICK_TREES, TRICK_TYPES_BY_SPORT } from "../../../../assets/gameContent/tricks/trickTrees";
import { buildTrickName, makeModifierKey } from "../../../skaters/trickNameUtils";
import {
  getNodeAvailability,
  purchaseNode,
  recalculateSkaterTypeRatings,
} from "../../../skaters/trickLibraryUtils";
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
import { getPieceImageUrl, getRotationFromDirection } from "./pieceImageUtils";
import {
  COMPETITION_CLOCK_DEFAULT,
  COMPETITION_SESSION_TICKS,
  DAY_NAMES,
  DAYS_PER_WEEK,
  LESSON_SESSION_TICKS,
  MAX_PLAYABLE_GRID_SIZE,
  MIN_TICK_DURATION_MS,
  RUN_DURATION_MS,
  SESSION_CLOCK_DEFAULT,
  SESSION_TICKS,
  SWITCH_CHANCE_BY_RATING,
  TYPE_KEYS,
  VIDEO_CLOCK_DEFAULT,
  VIDEO_SESSION_TICKS,
} from "./useGridModel.constants";
import {
  applyPieceDifficultyBailPenalty,
  buildRoutePiece,
  clamp,
  createDefaultSessionState,
  getAttemptGapChance,
  getBasePointsForTrick,
  getControlRangeForLandChance,
  getCoreNodeByName,
  getInitialsFromName,
  getLandChanceFromTrickChance,
  getLearningCountKey,
  getLessonRetryLandBonus,
  getMiddleSpeedInvalidReason,
  getModifierNodeByKey,
  getPieceFacingDirection,
  getPotentialForType,
  getRouteDirectionFromPieces,
  getRouteSpeedAfterPieces,
  getSkillLevel,
  getSportDifficultyValue,
  getTrickChanceValues,
  getTrickPoints,
  getTrickSteezeScore,
  getTypePercent,
  makeRouteSkateparkEntry,
  makeStandaloneSkateparkEntry,
  normalizeInstructorList,
  normalizeTimeState,
  parseCoordinate,
  parseSize,
  parseTileKey,
  sleep,
  toNumeric,
  withSessionTiming,
} from "./useGridModel.helpers";
import {
  BeginnerSportModal,
  CompetitionResultsModal,
  CompetitionSetupModal,
  EditsLibraryModal,
  LessonFeedbackModal,
  LessonSetupModal,
  VideoSessionResultsModal,
  VideoSetupModal,
  VideoTickReviewModal,
} from "./useGridModel.modals";

const chooseRandom = (items) => items[randomIntInclusive(0, items.length - 1)];

const buildLessonTeachAttempt = ({
  skater,
  instructor,
  target,
  trickType,
  maxCoreLevel,
  lowGapMode = false,
}) => {
  const sport = skater?.sport || SKATER_SPORT.SKATEBOARDER;
  const tree = TRICK_TREES?.[sport]?.[trickType] || [];
  if (!Array.isArray(tree) || tree.length < 1) return null;

  const targetPieces = Array.isArray(target?.runPieces) ? target.runPieces : [];
  const teachablePieces = targetPieces
    .map((piece) => ({
      piece,
      difficulty: getSportDifficultyValue(piece?.difficulty, sport, trickType),
    }))
    .filter((item) => item.difficulty > 0);
  if (teachablePieces.length < 1) return null;

  const library = Array.isArray(skater?.trickLibrary) ? skater.trickLibrary : [];
  const instructorCoreCap = clamp(Number(instructor?.coreRating || 1), 1, 5);
  const instructorVariantCap = clamp(Number(instructor?.variantRating || 1), 1, 5);
  const explicitCap = maxCoreLevel ? clamp(Number(maxCoreLevel), 1, 5) : null;

  let coreCandidates = [];
  tree.forEach((coreNode) => {
    const coreLevel = Number(coreNode?.level || 1);
    if (coreLevel > instructorCoreCap) return;
    if (explicitCap != null && coreLevel > explicitCap) return;
    const availability = getNodeAvailability(library, trickType, coreNode, null, sport);
    if (!availability?.available) return;
    coreCandidates.push({ kind: "core", coreNode, level: coreLevel });
  });

  let modifierCandidates = [];
  (library || []).filter((entry) => entry.type === trickType).forEach((entry) => {
    const coreNode = getCoreNodeByName(sport, trickType, entry.core);
    if (!coreNode) return;
    (coreNode.modifiers || []).forEach((modifierNode) => {
      const modifierLevel = Number(modifierNode?.level || 1);
      if (modifierLevel > instructorVariantCap) return;
      if (explicitCap != null && modifierLevel > explicitCap) return;
      const availability = getNodeAvailability(library, trickType, coreNode, modifierNode, sport);
      if (!availability?.available) return;
      modifierCandidates.push({
        kind: "modifier",
        coreNode,
        modifierNode,
        level: modifierLevel,
      });
    });
  });

  if (coreCandidates.length < 1 && modifierCandidates.length < 1) return null;

  if (explicitCap == null && coreCandidates.length > 0) {
    const highestCoreLevel = Math.max(...coreCandidates.map((item) => item.level));
    coreCandidates = coreCandidates.filter((item) => item.level === highestCoreLevel);
  }

  const chooseCore = modifierCandidates.length < 1
    ? true
    : coreCandidates.length < 1
      ? false
      : randomIntInclusive(1, 100) <= 40;

  const selected = chooseCore
    ? chooseRandom(coreCandidates)
    : chooseRandom(modifierCandidates);
  if (!selected) return null;

  const chosenPiece = chooseRandom(teachablePieces);
  const isModifier = selected.kind === "modifier";
  const modifiers = isModifier
    ? [{
      kind: selected.modifierNode.kind,
      name: selected.modifierNode.name,
      level: Number(selected.modifierNode.level || 1),
      cost: Number(selected.modifierNode.cost || selected.modifierNode.level || 1),
      placement: selected.modifierNode.placement,
      parentVariant: selected.modifierNode.parentVariant || selected.modifierNode.name,
      lockedBy: selected.modifierNode.lockedBy || null,
    }]
    : [];
  const coreLevel = Number(selected.coreNode?.level || 1);
  const variantLevel = isModifier ? Number(selected.modifierNode?.level || 0) : 0;
  const trickName = buildTrickName(selected.coreNode.core, modifiers);
  const modifierKey = isModifier ? makeModifierKey(modifiers[0]) : "";
  const comboKey = `${trickType}|${selected.coreNode.core}|${modifierKey}`;

  return {
    trickType,
    coreName: selected.coreNode.core,
    coreLevel,
    variantLevel,
    modifier: modifiers[0] || null,
    modifierKey: modifierKey || null,
    trickName,
    comboKey,
    pieceName: chosenPiece.piece.name,
    pieceCoordinate: chosenPiece.piece.coordinate,
    pieceDifficulty: chosenPiece.difficulty,
    pieceLabel: `${chosenPiece.piece.name}${chosenPiece.piece.coordinate ? ` (${chosenPiece.piece.coordinate})` : ""}`,
    lowGapMode,
    isCore: !isModifier,
  };
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
  const [playerEdits, setPlayerEdits] = useState(() =>
    Array.isArray(gameState?.player?.edits) ? gameState.player.edits : []
  );
  const [playerInstructors, setPlayerInstructors] = useState(() =>
    normalizeInstructorList(gameState?.player?.instructors)
  );
  const [playerLessonLandingCounts, setPlayerLessonLandingCounts] = useState(() =>
    gameState?.player?.lessonLandingCounts && typeof gameState.player.lessonLandingCounts === "object"
      ? gameState.player.lessonLandingCounts
      : {}
  );
  const [skatepark, setSkatepark] = useState(() => (Array.isArray(gameState.skatepark) ? gameState.skatepark : []));
  const [timeState, setTimeState] = useState(() => normalizeTimeState(gameState?.time));
  const [sessionState, setSessionState] = useState(createDefaultSessionState);

  const standaloneCounterRef = useRef(1);
  const routeCounterRef = useRef(1);

  useEffect(() => {
    setGameValue("skatepark", skatepark);
  }, [setGameValue, skatepark]);

  useEffect(() => {
    setGameValue("player.skaterPool", playerSkaterPool);
  }, [playerSkaterPool, setGameValue]);

  useEffect(() => {
    setGameValue("player.edits", playerEdits);
  }, [playerEdits, setGameValue]);

  useEffect(() => {
    setGameValue("player.instructors", playerInstructors);
  }, [playerInstructors, setGameValue]);

  useEffect(() => {
    setGameValue("player.lessonLandingCounts", playerLessonLandingCounts);
  }, [playerLessonLandingCounts, setGameValue]);

  useEffect(() => {
    const source = Array.isArray(gameState?.player?.instructors) ? gameState.player.instructors : [];
    setPlayerInstructors(normalizeInstructorList(source));
  }, [gameState?.player?.instructors]);

  useEffect(() => {
    const source = Array.isArray(gameState?.player?.edits) ? gameState.player.edits : [];
    setPlayerEdits(source);
  }, [gameState?.player?.edits]);

  useEffect(() => {
    const source = gameState?.player?.lessonLandingCounts;
    setPlayerLessonLandingCounts(source && typeof source === "object" ? source : {});
  }, [gameState?.player?.lessonLandingCounts]);

  useEffect(() => {
    setGameValue("skateparkConfig.gridSize", gridSize);
  }, [gridSize, setGameValue]);

  useEffect(() => {
    setGameValue("time", timeState);
  }, [setGameValue, timeState]);

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

  const lessonTargets = useMemo(() => {
    const targets = [];
    placedStandalone.forEach((item) => {
      targets.push({
        targetId: `lesson-standalone-${item.instanceId}`,
        label: `${item.name} (${toCoordinate(item.topLeft.row, item.topLeft.col)})`,
        type: "Standalone",
        startCell: { row: item.topLeft.row, col: item.topLeft.col },
        runTiles: item.tiles.map((tile) => ({ row: tile.row, col: tile.col })),
        tileKeys: item.tiles.map((tile) => makeTileKey(tile.row, tile.col)),
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
      targets.push({
        targetId: `lesson-route-${route.routeId}`,
        label: `${route.name}`,
        type: "Route",
        startCell: route.pieces[0] ? { row: route.pieces[0].row, col: route.pieces[0].col } : null,
        runTiles: route.pieces.map((piece) => ({ row: piece.row, col: piece.col })),
        tileKeys: route.pieces.map((piece) => makeTileKey(piece.row, piece.col)),
        runPieces: route.pieces.map((piece) => ({
          name: piece.name,
          coordinate: piece.coordinates,
          trickOpportunities: piece.trickOpportunities || 0,
          difficulty: piece.difficulty || null,
        })),
      });
    });
    return targets;
  }, [committedRoutes, placedStandalone]);

  const lessonTargetByTileKey = useMemo(() => {
    const map = new Map();
    lessonTargets.forEach((target) => {
      target.tileKeys.forEach((tileKey) => map.set(tileKey, target));
    });
    return map;
  }, [lessonTargets]);

  const lessonTargetById = useMemo(() => {
    const map = new Map();
    lessonTargets.forEach((target) => map.set(target.targetId, target));
    return map;
  }, [lessonTargets]);
  const videoTargetById = lessonTargetById;
  const videoTargetByTileKey = lessonTargetByTileKey;

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
  const hasSessionAvailableToday = useMemo(
    () => timeState.dayNumber > timeState.lastSessionDayNumber,
    [timeState.dayNumber, timeState.lastSessionDayNumber]
  );
  const currentWeek = useMemo(
    () => Math.floor((timeState.dayNumber - 1) / DAYS_PER_WEEK) + 1,
    [timeState.dayNumber]
  );
  const currentDayName = useMemo(
    () => DAY_NAMES[(timeState.dayNumber - 1) % DAYS_PER_WEEK],
    [timeState.dayNumber]
  );
  const hasAnySkateparkPiece = useMemo(
    () => placedStandalone.length > 0 || committedRoutes.length > 0,
    [committedRoutes.length, placedStandalone.length]
  );
  const lessonSlotCapacity = useMemo(() => lessonTargets.length, [lessonTargets.length]);
  const availableLessonInstructors = useMemo(
    () => playerInstructors.filter((instructor) => Number(instructor?.lessonSlotsRemaining ?? 0) > 0),
    [playerInstructors]
  );

  const canStartBeginnerSession = useMemo(() => {
    if (!hasAnySkateparkPiece) return false;
    if (!hasSessionAvailableToday) return false;
    if (startingSpotsCapacity < 2) return false;
    if (!sessionState.isActive) {
      if (playerSkaterPool.length === 0) return true;
      return startingSpotsCapacity > playerSkaterPool.length;
    }
    return false;
  }, [hasAnySkateparkPiece, hasSessionAvailableToday, playerSkaterPool.length, sessionState.isActive, startingSpotsCapacity]);

  const canStartNormalSession = useMemo(
    () => hasAnySkateparkPiece && hasSessionAvailableToday && !sessionState.isActive && playerSkaterPool.length > 0,
    [hasAnySkateparkPiece, hasSessionAvailableToday, playerSkaterPool.length, sessionState.isActive]
  );

  const canStartLessonSession = useMemo(
    () =>
      hasAnySkateparkPiece &&
      hasSessionAvailableToday &&
      !sessionState.isActive &&
      playerSkaterPool.length > 0 &&
      availableLessonInstructors.length > 0 &&
      lessonSlotCapacity > 0,
    [
      availableLessonInstructors.length,
      hasAnySkateparkPiece,
      hasSessionAvailableToday,
      lessonSlotCapacity,
      playerSkaterPool.length,
      sessionState.isActive,
    ]
  );
  const canStartCompetitionSession = useMemo(
    () =>
      hasAnySkateparkPiece &&
      hasSessionAvailableToday &&
      !sessionState.isActive &&
      startingSpotsCapacity >= 4,
    [hasAnySkateparkPiece, hasSessionAvailableToday, sessionState.isActive, startingSpotsCapacity]
  );
  const canStartVideoSession = useMemo(
    () =>
      hasAnySkateparkPiece &&
      hasSessionAvailableToday &&
      !sessionState.isActive &&
      playerSkaterPool.some((skater) => Boolean(skater?.isSponsored)),
    [hasAnySkateparkPiece, hasSessionAvailableToday, playerSkaterPool, sessionState.isActive]
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
        sport: skater.sport,
        markerType: "skater",
        trickName: sessionState.activeRunTricks?.[skater.id] || null,
      });
      markersByTile.set(key, list);
    });
    return markersByTile;
  }, [sessionState.activeRunTricks, sessionState.skaterPositions, skaterById]);

  const instructorMarkers = useMemo(() => {
    const markersByTile = new Map();
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return markersByTile;

    Object.entries(sessionState.lesson?.placementsByInstructor || {}).forEach(([instructorId, placement]) => {
      if (!placement || !Number.isInteger(placement.row) || !Number.isInteger(placement.col)) return;
      const instructor = playerInstructors.find((item) => item.id === instructorId);
      const key = makeTileKey(placement.row, placement.col);
      const list = markersByTile.get(key) || [];
      list.push({
        id: instructorId,
        initials: instructor?.initials || getInitialsFromName(instructor?.name),
        color: "#facc15",
        markerType: "instructor",
      });
      markersByTile.set(key, list);
    });

    return markersByTile;
  }, [gridMode, playerInstructors, sessionState.lesson?.placementsByInstructor, sessionState.sessionType]);

  const cameraMarkers = useMemo(() => {
    const markersByTile = new Map();
    if (gridMode !== "session" || sessionState.sessionType !== "video") return markersByTile;
    const selectedTargetId = sessionState.video?.selectedTargetId;
    if (!selectedTargetId) return markersByTile;
    const target = videoTargetById.get(selectedTargetId);
    if (!target) return markersByTile;
    const tileKeys = Array.isArray(target.tileKeys) ? target.tileKeys : [];
    const firstTile = tileKeys[0];
    if (!firstTile) return markersByTile;
    markersByTile.set(firstTile, [{
      id: `camera-${selectedTargetId}`,
      initials: "CAM",
      markerType: "camera",
    }]);
    return markersByTile;
  }, [gridMode, sessionState.sessionType, sessionState.video?.selectedTargetId, videoTargetById]);

  const lessonState = useMemo(
    () => ({
      currentTick: sessionState.currentTick,
      maxTicks: sessionState.maxTicks,
      ...(sessionState.lesson || {}),
    }),
    [sessionState.currentTick, sessionState.lesson, sessionState.maxTicks]
  );

  const lessonSelectedInstructors = useMemo(() => {
    const selected = sessionState.lesson?.selectedInstructorIds || [];
    return selected
      .map((id) => playerInstructors.find((instructor) => instructor.id === id))
      .filter(Boolean);
  }, [playerInstructors, sessionState.lesson?.selectedInstructorIds]);

  const lessonSelectedSkaters = useMemo(() => {
    const selected = sessionState.lesson?.selectedSkaterIds || [];
    return selected
      .map((id) => playerSkaterPool.find((skater) => skater.id === id))
      .filter(Boolean);
  }, [playerSkaterPool, sessionState.lesson?.selectedSkaterIds]);

  const lessonTickReady = useMemo(() => {
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return false;
    if (sessionState.isTickRunning) return false;
    if (sessionState.lesson?.isPlacementPhase) return false;
    if (sessionState.currentTick >= sessionState.maxTicks) return false;
    const instructorIds = sessionState.lesson?.selectedInstructorIds || [];
    const lockedByInstructor = sessionState.lesson?.lockedRetriesByInstructor || {};
    const assignments = sessionState.lesson?.tickAssignmentsByInstructor || {};
    if (instructorIds.length < 1) return false;

    const usedSkaters = new Set();
    for (const instructorId of instructorIds) {
      const locked = lockedByInstructor[instructorId];
      if (locked?.skaterId) {
        if (usedSkaters.has(locked.skaterId)) return false;
        usedSkaters.add(locked.skaterId);
        continue;
      }
      const plan = assignments[instructorId];
      if (!plan?.skaterId || !plan?.trickType) return false;
      if (usedSkaters.has(plan.skaterId)) return false;
      usedSkaters.add(plan.skaterId);
    }
    return true;
  }, [gridMode, sessionState.currentTick, sessionState.isTickRunning, sessionState.lesson, sessionState.maxTicks, sessionState.sessionType]);

  const videoTickReady = useMemo(() => {
    if (gridMode !== "session" || sessionState.sessionType !== "video") return false;
    if (!sessionState.isActive || sessionState.isTickRunning) return false;
    if (sessionState.currentTick >= sessionState.maxTicks) return false;
    if (!sessionState.video?.selectedTargetId) return false;
    if (sessionState.video?.landedReviewPending) return false;
    return true;
  }, [gridMode, sessionState.currentTick, sessionState.isActive, sessionState.isTickRunning, sessionState.maxTicks, sessionState.sessionType, sessionState.video]);

  const lessonHighlightTileKeys = useMemo(() => {
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return new Set();
    if (!sessionState.lesson?.isPlacementPhase || !sessionState.lesson?.activePlacementInstructorId) return new Set();
    const usedTargetIds = new Set(Object.values(sessionState.lesson?.placementsByInstructor || {}).map((item) => item.targetId));
    const activeInstructorId = sessionState.lesson.activePlacementInstructorId;
    const currentPlacement = sessionState.lesson?.placementsByInstructor?.[activeInstructorId];
    const keys = new Set();
    lessonTargets.forEach((target) => {
      if (currentPlacement?.targetId === target.targetId || !usedTargetIds.has(target.targetId)) {
        target.tileKeys.forEach((key) => keys.add(key));
      }
    });
    return keys;
  }, [gridMode, lessonTargets, sessionState.lesson, sessionState.sessionType]);

  const lessonTrickTypeOptionsByInstructor = useMemo(() => {
    const result = {};
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return result;

    const selectedInstructorIds = sessionState.lesson?.selectedInstructorIds || [];
    const lockedByInstructor = sessionState.lesson?.lockedRetriesByInstructor || {};
    const tickAssignments = sessionState.lesson?.tickAssignmentsByInstructor || {};
    const selectedSkaterByInstructor = sessionState.lesson?.selectedSkaterByInstructor || {};

    selectedInstructorIds.forEach((instructorId) => {
      const placement = sessionState.lesson?.placementsByInstructor?.[instructorId];
      const target = placement ? lessonTargetById.get(placement.targetId) : null;
      if (!target) {
        result[instructorId] = [];
        return;
      }

      const locked = lockedByInstructor[instructorId];
      const assignment = tickAssignments[instructorId];
      const fallbackSkaterId = selectedSkaterByInstructor[instructorId];
      const activeSkaterId = locked?.skaterId || assignment?.skaterId || fallbackSkaterId || null;
      const skater = sessionState.skaters.find((item) => item.id === activeSkaterId);
      const sport = skater?.sport || SKATER_SPORT.SKATEBOARDER;

      const availableTypes = TYPE_KEYS.filter((typeKey) =>
        (target.runPieces || []).some((piece) => getSportDifficultyValue(piece?.difficulty, sport, typeKey) > 0)
      );
      result[instructorId] = availableTypes;
    });

    return result;
  }, [gridMode, lessonTargetById, sessionState.lesson, sessionState.sessionType, sessionState.skaters]);

  const occupancy = useMemo(() => {
    const map = new Map();

    placedStandalone.forEach((item) => {
      const standalonePieceMeta = { id: item.pieceId, name: item.name };
      const imageUrl = getPieceImageUrl(standalonePieceMeta);
      item.tiles.forEach((tile) => {
        const offsetRow = tile.row - item.topLeft.row;
        const offsetCol = tile.col - item.topLeft.col;
        map.set(makeTileKey(tile.row, tile.col), {
          kind: "standalone",
          instanceId: item.instanceId,
          pieceId: item.pieceId,
          name: item.name,
          color: item.color,
          isOrigin: tile.row === item.topLeft.row && tile.col === item.topLeft.col,
          imageUrl,
          spanRows: item.size.rows,
          spanCols: item.size.cols,
          offsetRow,
          offsetCol,
        });
      });
    });

    committedRoutes.forEach((route) => {
      const routeDirection = getRouteDirectionFromPieces(route.pieces, route.direction);
      route.pieces.forEach((piece, pieceIndex) => {
        const isStart = pieceIndex === 0;
        const isEnd = pieceIndex === route.pieces.length - 1;
        const pieceDirection = getPieceFacingDirection(piece, isStart, isEnd, routeDirection);
        map.set(makeTileKey(piece.row, piece.col), {
          kind: "route",
          routeId: route.routeId,
          pieceIndex,
          pieceId: piece.id,
          name: piece.name,
          color: piece.color,
          imageUrl: getPieceImageUrl(piece),
          rotationDeg: getRotationFromDirection(pieceDirection),
        });
      });
    });

    if (gridMode === "edit" && editingRoute) {
      const routeDirection = getRouteDirectionFromPieces(editingRoute.pieces, editingRoute.direction);
      editingRoute.pieces.forEach((piece, pieceIndex) => {
        const isStart = pieceIndex === 0;
        const isEnd = pieceIndex === editingRoute.pieces.length - 1;
        const pieceDirection = getPieceFacingDirection(piece, isStart, isEnd, routeDirection);
        map.set(makeTileKey(piece.row, piece.col), {
          kind: "editing-route",
          pieceId: piece.id,
          name: piece.name,
          color: piece.color,
          imageUrl: getPieceImageUrl(piece),
          rotationDeg: getRotationFromDirection(pieceDirection),
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
      if (
        gridMode === "session" &&
        sessionState.sessionType === "lesson" &&
        sessionState.lesson?.isPlacementPhase &&
        sessionState.lesson?.activePlacementInstructorId
      ) {
        const target = lessonTargetByTileKey.get(makeTileKey(row, col));
        if (!target) return;
        const usedTargetIds = new Set(
          Object.entries(sessionState.lesson?.placementsByInstructor || {})
            .filter(([instructorId]) => instructorId !== sessionState.lesson.activePlacementInstructorId)
            .map(([, placement]) => placement.targetId)
        );
        if (usedTargetIds.has(target.targetId)) {
          warning("Another instructor is already placed on that route/piece.");
          return;
        }

        const nextPlacements = {
          ...(sessionState.lesson?.placementsByInstructor || {}),
          [sessionState.lesson.activePlacementInstructorId]: {
            targetId: target.targetId,
            label: target.label,
            row,
            col,
          },
        };
        const requiredCount = (sessionState.lesson?.selectedInstructorIds || []).length;
        const isPlacementComplete = Object.keys(nextPlacements).length >= requiredCount && requiredCount > 0;

        setSessionState((prev) => ({
          ...prev,
          isActive: true,
          lesson: {
            ...prev.lesson,
            placementsByInstructor: nextPlacements,
            activePlacementInstructorId: null,
            isPlacementPhase: !isPlacementComplete,
          },
        }));

        if (isPlacementComplete) {
          success("All instructors placed. Lesson setup complete.");
        } else {
          info("Instructor placed. Select the next instructor.");
        }
        return;
      }

      if (gridMode === "session" && sessionState.sessionType === "video" && sessionState.isActive) {
        const target = videoTargetByTileKey.get(makeTileKey(row, col));
        if (!target) return;
        setSessionState((prev) => ({
          ...prev,
          video: {
            ...prev.video,
            selectedTargetId: target.targetId,
          },
        }));
        info(`Camera moved to ${target.label}.`);
        return;
      }

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
    [
      closeModal,
      editMode,
      gridMode,
      info,
      lessonTargetByTileKey,
      videoTargetByTileKey,
      occupancy,
      openModal,
      removeRoute,
      removeStandalone,
      sessionState.isActive,
      sessionState.lesson,
      sessionState.sessionType,
      success,
      warning,
    ]
  );

  const onToggleDeleteMode = useCallback(() => {
    if (gridMode !== "edit") return warning("Delete mode is only available in Edit Skatepark mode.");
    if (editingRoute) return warning("Cancel or commit the route before entering delete mode.");
    setEditMode((prev) => (prev === "delete" ? "build" : "delete"));
  }, [editingRoute, gridMode, warning]);

  const onGridSizeChange = useCallback(
    (value) => {
      const nextSize = Number(value);
      if (!Number.isInteger(nextSize) || nextSize < MIN_GRID_SIZE || nextSize > MAX_PLAYABLE_GRID_SIZE) return;

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

  const getDropPreviewTiles = useCallback(
    (row, col, pieceId) => {
      if (gridMode !== "edit" || editMode !== "build") return [];
      const piece = [...standalonePieces, ...routePieces].find((item) => item.id === pieceId);
      if (!piece) return [];

      if (piece.type === "Standalone") {
        if (editingRoute) return [];
        if (!canPlaceStandalone(row, col, piece.size, gridSize, occupancy)) return [];
        return buildStandaloneTiles(row, col, piece.size);
      }

      if (piece.type !== "Route" || editingRoute?.complete) return [];
      if (occupancy.has(makeTileKey(row, col))) return [];

      if (!editingRoute) {
        return hasRouteType(piece, "Start") ? [{ row, col }] : [];
      }

      if (editingRoute.pieces.length === 1) {
        if (!hasRouteType(piece, "Middle")) return [];
        if (getMiddleSpeedInvalidReason(piece, editingRoute.currentSpeed || 0)) return [];
        const direction = getDirectionFromFirstMiddle(editingRoute.pieces[0], { row, col });
        return direction ? [{ row, col }] : [];
      }

      if (!hasRouteType(piece, "Middle") && !hasRouteType(piece, "End")) return [];
      if (hasRouteType(piece, "Middle") && getMiddleSpeedInvalidReason(piece, editingRoute.currentSpeed || 0)) return [];
      const lastPiece = editingRoute.pieces[editingRoute.pieces.length - 1];
      const expected = getNextCellByDirection(lastPiece.row, lastPiece.col, editingRoute.direction);
      if (!inBounds(row, col, gridSize)) return [];
      if (expected.row !== row || expected.col !== col) return [];

      return [{ row, col }];
    },
    [editMode, editingRoute, gridMode, gridSize, occupancy, routePieces, standalonePieces]
  );

  const animateSkaterOnTarget = useCallback(async (skaterId, target) => {
    const runTiles = Array.isArray(target?.runTiles) ? target.runTiles : [];
    const keyTiles = Array.isArray(target?.tileKeys)
      ? target.tileKeys.map(parseTileKey).filter(Boolean)
      : [];
    const startCell = target?.startCell && Number.isInteger(target.startCell.row) && Number.isInteger(target.startCell.col)
      ? [target.startCell]
      : [];

    const baseTiles = runTiles.length > 0 ? runTiles : keyTiles.length > 0 ? keyTiles : startCell;
    const orderedTiles = (() => {
      if (target?.type === "Route") return baseTiles;
      if (startCell.length > 0 && baseTiles.length > 1) {
        const startKey = makeTileKey(startCell[0].row, startCell[0].col);
        const remaining = baseTiles.filter((tile) => makeTileKey(tile.row, tile.col) !== startKey);
        return [startCell[0], ...shuffleItems(remaining)];
      }
      return shuffleItems(baseTiles);
    })();
    const tiles = orderedTiles.length > 0 ? orderedTiles : [];
    if (tiles.length < 1) return;
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
    (sessionType, baseSkaters, options = {}) => {
      const skaters = baseSkaters.map(withSessionTiming);
      const isCompetition = sessionType === "competition";
      const maxTicks = isCompetition ? COMPETITION_SESSION_TICKS : SESSION_TICKS;
      const clock = isCompetition ? COMPETITION_CLOCK_DEFAULT : SESSION_CLOCK_DEFAULT;
      const finalSkaters = isCompetition
        ? skaters.map((skater) => ({ ...skater, arrivalTick: 1, energy: COMPETITION_SESSION_TICKS }))
        : skaters;

      setGridMode("session");
      setEditMode("build");
      setSessionState({
        ...createDefaultSessionState(),
        isActive: true,
        currentTick: 0,
        maxTicks,
        sessionType,
        skaters: finalSkaters,
        beginnerCandidates: sessionType === "beginner" ? baseSkaters : [],
        clock,
        competition: isCompetition
          ? {
            sport: options.sport || null,
            level: options.level || null,
            slots: Number(options.slots || finalSkaters.length || 0),
            sponsoredCount: Number(options.sponsoredCount || 0),
          }
          : createDefaultSessionState().competition,
      });

      success(
        sessionType === "beginner"
          ? "Beginner session started."
          : sessionType === "competition"
            ? "Competition session started."
            : "Normal session started."
      );
    },
    [success]
  );

  const onStartBeginnerSession = useCallback(() => {
    if (editingRoute) return warning("Commit or cancel the current route first.");
    if (!hasAnySkateparkPiece) return warning("Place at least one piece in the skatepark before starting a session.");
    if (!hasSessionAvailableToday) return warning("You can only hold one session per day.");
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
    hasAnySkateparkPiece,
    hasSessionAvailableToday,
    openModal,
    startSessionWithSkaters,
    startingSpotsCapacity,
    warning,
  ]);

  const onStartNormalSession = useCallback(() => {
    if (editingRoute) return warning("Commit or cancel the current route first.");
    if (!hasAnySkateparkPiece) return warning("Place at least one piece in the skatepark before starting a session.");
    if (!hasSessionAvailableToday) return warning("You can only hold one session per day.");
    if (!canStartNormalSession) return warning("Add skaters to your pool before starting a normal session.");
    if (startingSpotsCapacity < 1) return warning("No starting spots are available in this skatepark.");

    const selected = shuffleItems(playerSkaterPool).slice(0, Math.min(playerSkaterPool.length, startingSpotsCapacity));
    if (selected.length < 1) return warning("No skaters can be assigned to this session.");

    startSessionWithSkaters("normal", selected);
  }, [
    canStartNormalSession,
    editingRoute,
    hasAnySkateparkPiece,
    hasSessionAvailableToday,
    playerSkaterPool,
    startSessionWithSkaters,
    startingSpotsCapacity,
    warning,
  ]);

  const onStartCompetitionSession = useCallback(() => {
    if (editingRoute) return warning("Commit or cancel the current route first.");
    if (!hasAnySkateparkPiece) return warning("Place at least one piece in the skatepark before starting a session.");
    if (!hasSessionAvailableToday) return warning("You can only hold one session per day.");
    if (!canStartCompetitionSession) return warning("Competition session is not available right now.");
    if (startingSpotsCapacity < 4) return warning("Competition sessions require at least 4 starting spots.");

    const maxSlots = Math.min(15, startingSpotsCapacity);
    openModal({
      modalTitle: "Setup Competition Session",
      buttons: MODAL_BUTTONS.NONE,
      modalContent: (
        <CompetitionSetupModal
          maxSlots={maxSlots}
          onStart={({ slots, sport, level }) => {
            const slotCount = Math.max(4, Math.min(maxSlots, Number(slots) || 4));
            const sponsoredLimit = Math.floor(slotCount / 2);
            const sponsoredEligible = shuffleItems(
              playerSkaterPool.filter((skater) => skater?.isSponsored && skater?.sport === sport)
            );
            const sponsoredPicked = sponsoredEligible.slice(0, sponsoredLimit);

            const generatorByLevel = {
              beginner: generateBeginnerSkater,
              "semi-pro": generateMediumSkater,
              pro: generateProSkater,
            };
            const generator = generatorByLevel[level] || generateBeginnerSkater;

            const guestsNeeded = Math.max(0, slotCount - sponsoredPicked.length);
            const guestSkaters = Array.from({ length: guestsNeeded }, (_, index) => ({
              ...generator(sport),
              id: `competition-guest-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 6)}`,
              isSponsored: false,
            }));

            const competitionSkaters = [...sponsoredPicked, ...guestSkaters].slice(0, slotCount);
            startSessionWithSkaters("competition", competitionSkaters, {
              slots: slotCount,
              sport,
              level,
              sponsoredCount: sponsoredPicked.length,
            });
            closeModal();
          }}
        />
      ),
    });
  }, [
    canStartCompetitionSession,
    closeModal,
    editingRoute,
    hasAnySkateparkPiece,
    hasSessionAvailableToday,
    openModal,
    playerSkaterPool,
    startSessionWithSkaters,
    startingSpotsCapacity,
    warning,
  ]);

  const onStartVideoSession = useCallback(() => {
    if (editingRoute) return warning("Commit or cancel the current route first.");
    if (!hasAnySkateparkPiece) return warning("Place at least one piece in the skatepark before starting a session.");
    if (!hasSessionAvailableToday) return warning("You can only hold one session per day.");
    if (!canStartVideoSession) return warning("Video session is not available right now.");
    const sponsoredBySport = {
      [SKATER_SPORT.SKATEBOARDER]: playerSkaterPool.some(
        (skater) => Boolean(skater?.isSponsored) && skater?.sport === SKATER_SPORT.SKATEBOARDER
      ),
      [SKATER_SPORT.ROLLERBLADER]: playerSkaterPool.some(
        (skater) => Boolean(skater?.isSponsored) && skater?.sport === SKATER_SPORT.ROLLERBLADER
      ),
    };
    const availableSports = Object.entries(sponsoredBySport)
      .filter(([, hasSponsored]) => hasSponsored)
      .map(([sport]) => sport);
    if (availableSports.length < 1) {
      warning("You need at least one sponsored skater to start a video session.");
      return;
    }
    const eligibleEdits = playerEdits.filter((edit) => sponsoredBySport[edit?.sportType]);

    openModal({
      modalTitle: "Setup Video Session",
      buttons: MODAL_BUTTONS.NONE,
      modalContent: (
        <VideoSetupModal
          edits={eligibleEdits}
          availableSports={availableSports}
          onStart={({ mode, name, length, sport, existingEditId }) => {
            let editId = existingEditId;
            let sessionSport = sport;
            if (mode === "new") {
              if (playerEdits.length >= 3) {
                warning("You can only have up to 3 edits at one time.");
                return;
              }
              const newEdit = {
                id: `edit-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
                name: name || `Edit ${playerEdits.length + 1}`,
                length: Math.max(1, Number(length) || 1),
                sportType: sport,
                footage: [],
              };
              editId = newEdit.id;
              setPlayerEdits((prev) => [...prev, newEdit]);
            } else {
              const existing = playerEdits.find((item) => item.id === existingEditId);
              if (!existing) {
                warning("Selected edit could not be found.");
                return;
              }
              sessionSport = existing.sportType;
            }

            if (mode !== "new") {
              sessionSport = playerEdits.find((item) => item.id === editId)?.sportType || sessionSport;
            }
            if (!sponsoredBySport[sessionSport]) {
              warning("No sponsored skaters available for that sport.");
              return;
            }
            const sponsoredSkaters = playerSkaterPool.filter(
              (skater) => skater?.isSponsored && skater?.sport === sessionSport
            );
            if (sponsoredSkaters.length < 1) {
              warning("No sponsored skaters available for that sport.");
              return;
            }

            const sessionSkaters = sponsoredSkaters.map((skater) => ({
              ...skater,
              arrivalTick: 1,
              energy: VIDEO_SESSION_TICKS,
            }));
            setGridMode("session");
            setEditMode("build");
            setSessionState({
              ...createDefaultSessionState(),
              isActive: true,
              currentTick: 0,
              maxTicks: VIDEO_SESSION_TICKS,
              sessionType: "video",
              skaters: sessionSkaters,
              clock: VIDEO_CLOCK_DEFAULT,
              video: {
                editId,
                selectedTargetId: null,
                sport: sessionSport,
                landedReviewPending: false,
              },
            });
            closeModal();
            success("Video session started. Select a route or standalone each tick.");
          }}
        />
      ),
    });
  }, [
    canStartVideoSession,
    closeModal,
    editingRoute,
    hasAnySkateparkPiece,
    hasSessionAvailableToday,
    openModal,
    playerEdits,
    playerSkaterPool,
    success,
    warning,
  ]);

  const onStartLessonSession = useCallback(() => {
    if (editingRoute) return warning("Commit or cancel the current route first.");
    if (!hasAnySkateparkPiece) return warning("Place at least one piece in the skatepark before starting a session.");
    if (!hasSessionAvailableToday) return warning("You can only hold one session per day.");
    if (playerInstructors.length < 1) return warning("Hire at least one instructor first.");
    if (availableLessonInstructors.length < 1) return warning("No instructors have lesson slots remaining this week.");
    if (playerSkaterPool.length < 1) return warning("Add at least one skater to your pool first.");
    if (lessonSlotCapacity < 1) return warning("No lesson placement targets are available in this skatepark.");
    if (!canStartLessonSession) return warning("Lesson session is not available right now.");

    const maxInstructorCount = Math.min(lessonSlotCapacity, availableLessonInstructors.length);
    openModal({
      modalTitle: "Setup Lesson Session",
      buttons: MODAL_BUTTONS.NONE,
      modalContent: (
        <LessonSetupModal
          instructors={availableLessonInstructors}
          skaters={playerSkaterPool}
          maxInstructorCount={maxInstructorCount}
          onStart={(selectedInstructorIds, selectedSkaterIds) => {
            const selectedSkaterByInstructor = {};
            selectedInstructorIds.forEach((instructorId, index) => {
              selectedSkaterByInstructor[instructorId] = selectedSkaterIds[index] || null;
            });

            setGridMode("session");
            setEditMode("build");
            setSessionState({
              ...createDefaultSessionState(),
              isActive: true,
              currentTick: 0,
              maxTicks: LESSON_SESSION_TICKS,
              sessionType: "lesson",
              skaters: selectedSkaterIds
                .map((skaterId) => playerSkaterPool.find((skater) => skater.id === skaterId))
                .filter(Boolean),
              lesson: {
                isPlacementPhase: true,
                activePlacementInstructorId: selectedInstructorIds[0] || null,
                selectedInstructorIds,
                selectedSkaterIds,
                selectedSkaterByInstructor,
                placementsByInstructor: {},
              },
              clock: LESSON_CLOCK_DEFAULT,
            });

            closeModal();
            success("Lesson session started. Place each instructor on the skatepark.");
          }}
        />
      ),
    });
  }, [
    availableLessonInstructors,
    canStartLessonSession,
    closeModal,
    editingRoute,
    hasAnySkateparkPiece,
    hasSessionAvailableToday,
    lessonSlotCapacity,
    openModal,
    playerInstructors.length,
    playerSkaterPool,
    success,
    warning,
  ]);

  const onOpenEditsModal = useCallback(() => {
    openModal({
      modalTitle: "Edits",
      buttons: MODAL_BUTTONS.OK,
      modalContent: <EditsLibraryModal edits={playerEdits} />,
    });
  }, [openModal, playerEdits]);

  const onSelectLessonInstructorForPlacement = useCallback((instructorId) => {
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return;
    if (!sessionState.lesson?.isPlacementPhase) return;
    if (!(sessionState.lesson?.selectedInstructorIds || []).includes(instructorId)) return;

    setSessionState((prev) => ({
      ...prev,
      lesson: {
        ...prev.lesson,
        activePlacementInstructorId: instructorId,
      },
    }));
  }, [gridMode, sessionState.lesson, sessionState.sessionType]);

  const onUpdateLessonTickAssignment = useCallback((instructorId, patch) => {
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return;
    if (sessionState.lesson?.isPlacementPhase) return;

    setSessionState((prev) => {
      const lockedByInstructor = prev.lesson?.lockedRetriesByInstructor || {};
      if (lockedByInstructor[instructorId]) return prev;

      const nextAssignments = {
        ...(prev.lesson?.tickAssignmentsByInstructor || {}),
        [instructorId]: {
          ...(prev.lesson?.tickAssignmentsByInstructor?.[instructorId] || {}),
          ...patch,
        },
      };

      const nextPlan = nextAssignments[instructorId];
      if (nextPlan?.skaterId) {
        const usedSkaterIds = new Set(
          Object.entries(lockedByInstructor)
            .filter(([id]) => id !== instructorId)
            .map(([, value]) => value.skaterId)
        );
        Object.entries(nextAssignments)
          .filter(([id]) => id !== instructorId)
          .forEach(([, value]) => {
            if (value?.skaterId) usedSkaterIds.add(value.skaterId);
          });
        if (usedSkaterIds.has(nextPlan.skaterId)) {
          return prev;
        }
      }

      return {
        ...prev,
        lesson: {
          ...prev.lesson,
          tickAssignmentsByInstructor: nextAssignments,
        },
      };
    });
  }, [gridMode, sessionState.lesson?.isPlacementPhase, sessionState.sessionType]);

  const onRandomizeLessonTickAssignments = useCallback(() => {
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return;
    if (sessionState.lesson?.isPlacementPhase) return;
    if (sessionState.isTickRunning) return;

    setSessionState((prev) => {
      const selectedInstructorIds = prev.lesson?.selectedInstructorIds || [];
      const lockedByInstructor = prev.lesson?.lockedRetriesByInstructor || {};
      const currentAssignments = prev.lesson?.tickAssignmentsByInstructor || {};

      const usedSkaterIds = new Set(
        Object.values(lockedByInstructor)
          .map((item) => item?.skaterId)
          .filter(Boolean)
      );

      selectedInstructorIds.forEach((instructorId) => {
        const assignment = currentAssignments[instructorId];
        if (assignment?.skaterId) usedSkaterIds.add(assignment.skaterId);
      });

      const availableSkaterIds = shuffleItems(
        (prev.lesson?.selectedSkaterIds || []).filter((skaterId) => !usedSkaterIds.has(skaterId))
      );

      const nextAssignments = { ...currentAssignments };

      selectedInstructorIds.forEach((instructorId) => {
        if (lockedByInstructor[instructorId]) return;

        const current = nextAssignments[instructorId] || {};
        let nextSkaterId = current.skaterId || null;
        let nextTrickType = current.trickType || null;

        if (!nextSkaterId && availableSkaterIds.length > 0) {
          nextSkaterId = availableSkaterIds.pop() || null;
        }

        if (!nextTrickType) {
          const allowedTypes = lessonTrickTypeOptionsByInstructor?.[instructorId] || [];
          if (allowedTypes.length > 0) {
            nextTrickType = allowedTypes[randomIntInclusive(0, allowedTypes.length - 1)];
          }
        }

        nextAssignments[instructorId] = {
          ...current,
          skaterId: nextSkaterId,
          trickType: nextTrickType,
        };
      });

      return {
        ...prev,
        lesson: {
          ...prev.lesson,
          tickAssignmentsByInstructor: nextAssignments,
        },
      };
    });
  }, [gridMode, lessonTrickTypeOptionsByInstructor, sessionState.isTickRunning, sessionState.lesson?.isPlacementPhase, sessionState.sessionType]);

  const onExecuteLessonTick = useCallback(async () => {
    if (!lessonTickReady) {
      warning("Assign all instructors before starting the tick.");
      return;
    }
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return;
    if (sessionState.lesson?.isPlacementPhase) return;
    if (sessionState.currentTick >= sessionState.maxTicks) return;

    const nextTick = sessionState.currentTick + 1;
    const selectedInstructorIds = sessionState.lesson?.selectedInstructorIds || [];
    const lockedByInstructor = sessionState.lesson?.lockedRetriesByInstructor || {};
    const assignments = sessionState.lesson?.tickAssignmentsByInstructor || {};

    let nextPool = [...playerSkaterPool];
    const nextLandingCounts = { ...playerLessonLandingCounts };
    const tickEntries = [];
    const nextLocked = {};
    const nextPositions = {};
    const animationPlans = [];
    const lowWarnings = [...(sessionState.lesson?.lowPotentialWarnings || [])];

    setSessionState((prev) => ({
      ...prev,
      isTickRunning: true,
      lesson: {
        ...prev.lesson,
        pendingTickEntries: [],
      },
    }));

    selectedInstructorIds.forEach((instructorId) => {
      const instructor = playerInstructors.find((item) => item.id === instructorId);
      const placement = sessionState.lesson?.placementsByInstructor?.[instructorId];
      const target = placement ? lessonTargetById.get(placement.targetId) : null;
      const locked = lockedByInstructor[instructorId] || null;
      const plan = locked || assignments[instructorId];
      const skater = nextPool.find((item) => item.id === plan?.skaterId);
      const targetLabel = target?.label || "Unplaced";

      if (!instructor || !placement || !target || !plan || !skater) {
        tickEntries.push({
          id: `lesson-${nextTick}-${instructorId}-${Math.random().toString(16).slice(2, 8)}`,
          tick: nextTick,
          instructorId,
          instructorName: instructor?.name || "Unknown Instructor",
          skaterId: skater?.id || null,
          skaterName: skater?.name || "Unassigned Skater",
          pieceLabel: targetLabel,
          trickType: plan?.trickType || null,
          trickName: "No Attempt",
          status: "Failed Setup",
          learned: false,
          retryLocked: false,
          isSwitch: false,
        });
        return;
      }

      nextPositions[skater.id] = { row: placement.row, col: placement.col };

      let attempt = locked?.attempt || null;
      const retryCount = Math.max(0, Number(locked?.retryCount) || 0);
      if (!attempt) {
        const requestedType = plan?.trickType;
        if (!requestedType || !TYPE_KEYS.includes(requestedType)) {
          tickEntries.push({
            id: `lesson-${nextTick}-${instructorId}-${Math.random().toString(16).slice(2, 8)}`,
            tick: nextTick,
            instructorId,
            instructorName: instructor.name,
            skaterId: skater.id,
            skaterName: skater.name,
            pieceLabel: targetLabel,
            trickType: requestedType || null,
            trickName: "No Attempt",
            status: "No Trick Type Selected",
            learned: false,
            retryLocked: false,
            isSwitch: false,
          });
          return;
        }

        let selectedAttempt = null;
        let forceBlockedByGap = false;
        for (let i = 0; i < 10; i += 1) {
          const candidate = buildLessonTeachAttempt({
            skater,
            instructor,
            target,
            trickType: requestedType,
            maxCoreLevel: plan?.maxCoreLevel || null,
          });
          if (!candidate) break;
          const currentPercent = getTypePercent(skater, requestedType);
          const potential = getPotentialForType(skater, requestedType);
          const gapInfo = getAttemptGapChance(potential, currentPercent);
          candidate.currentPercent = currentPercent;
          candidate.potential = potential;
          candidate.gap = gapInfo.gap;
          candidate.gapMode = gapInfo.mode;
          candidate.baseGapChance = gapInfo.chance;
          if (gapInfo.gap <= 5) {
            selectedAttempt = candidate;
            forceBlockedByGap = true;
            continue;
          }
          selectedAttempt = candidate;
          forceBlockedByGap = false;
          break;
        }
        attempt = selectedAttempt;
        if (forceBlockedByGap && attempt) {
          attempt.baseGapChance = 0;
          const msg = `${skater.name} (${attempt.trickType}) has too little potential gap (${attempt.gap}).`;
          if (!lowWarnings.includes(msg)) lowWarnings.push(msg);
        }
      }

      if (!attempt) {
        tickEntries.push({
          id: `lesson-${nextTick}-${instructorId}-${Math.random().toString(16).slice(2, 8)}`,
          tick: nextTick,
          instructorId,
          instructorName: instructor.name,
          skaterId: skater.id,
          skaterName: skater.name,
          pieceLabel: targetLabel,
          trickType: plan?.trickType || null,
          trickName: "No Attempt",
          status: "No Teachable Trick",
          learned: false,
          retryLocked: false,
          isSwitch: false,
        });
        return;
      }

      const sw = clamp(Number(skater.switchRating || 1), 1, 10);
      const swPotential = clamp(Number(skater.switchPotential || 1), 1, 10);
      const canSwitch = sw < swPotential;
      const switchChance = canSwitch ? (SWITCH_CHANCE_BY_RATING[sw] || 0) : 0;
      const isSwitch = switchChance > 0 && randomIntInclusive(1, 100) <= switchChance;

      const str = clamp(Number(attempt.currentPercent ?? getTypePercent(skater, attempt.trickType)), 0, 100);
      const ptr = clamp(Number(attempt.potential ?? getPotentialForType(skater, attempt.trickType)), 0, 100);
      const gapInfo = getAttemptGapChance(ptr, str);
      if (gapInfo.gap < 10) {
        const msg = `${skater.name} (${attempt.trickType}) has low learning headroom (gap ${gapInfo.gap}).`;
        if (!lowWarnings.includes(msg)) lowWarnings.push(msg);
      }
      const itr = clamp(Number(instructor?.ratings?.[attempt.trickType] || 1), 1, 100);
      const sd = clamp(Number(skater?.determination || 1), 1, 100);
      const id = clamp(Number(instructor?.determination || 1), 1, 100);
      const isw = clamp(Number(instructor?.switchRating || 1), 1, 10);
      const td = attempt.variantLevel > 0 ? attempt.variantLevel : attempt.coreLevel;
      let d = Math.max(0, (Math.max(1, td) * Math.max(1, Number(attempt.pieceDifficulty || 1))) * 10);
      if (isSwitch) {
        d += Math.max(0, 200 - ((sw + isw) * 10));
      }

      const rawSc = (str * 3) + (itr * 3) + sd;
      const sc = clamp(rawSc, 0, 500);
      let landChance = 0;
      if (gapInfo.mode === "blocked") {
        landChance = 0;
      } else if (gapInfo.mode === "low") {
        landChance = gapInfo.chance || 0;
      } else {
        const adjusted = clamp(sc - d, 0, 500);
        landChance = clamp(25 + Math.round(adjusted / 10), 25, 75);
      }

      const retryBonus = getLessonRetryLandBonus(retryCount);
      const adjustedLandChance = clamp(landChance + retryBonus, 0, 100);
      const landed = randomIntInclusive(1, 100) <= adjustedLandChance;
      let learned = false;

      if (landed) {
        if (isSwitch && sw < swPotential) {
          nextPool = nextPool.map((item) =>
            item.id === skater.id
              ? { ...item, switchRating: clamp(Number(item.switchRating || 1) + 1, 1, 10) }
              : item
          );
        }

        const countKey = getLearningCountKey(skater.id, attempt.comboKey);
        const nextCount = (Number(nextLandingCounts[countKey]) || 0) + 1;
        nextLandingCounts[countKey] = nextCount;

        const requiredLands = Math.max(1, Number(attempt.coreLevel || 1));
        if (nextCount >= requiredLands) {
          const currentSkater = nextPool.find((item) => item.id === skater.id) || skater;
          const coreNode = getCoreNodeByName(currentSkater.sport, attempt.trickType, attempt.coreName);
          const modifierNode = attempt.modifierKey
            ? getModifierNodeByKey(coreNode, attempt.modifierKey)
            : null;
          if (coreNode) {
            const purchaseResult = purchaseNode({
              trickLibrary: currentSkater.trickLibrary || [],
              type: attempt.trickType,
              coreNode,
              modifierNode,
              sport: currentSkater.sport,
            });
            if (purchaseResult.success) {
              learned = true;
              nextPool = nextPool.map((item) => {
                if (item.id !== skater.id) return item;
                const withLibrary = {
                  ...item,
                  trickLibrary: purchaseResult.trickLibrary,
                };
                return {
                  ...withLibrary,
                  ...recalculateSkaterTypeRatings(withLibrary),
                };
              });
            }
          }
        }
      }

      const retryChanceBase = landed ? Math.ceil((sd + id) / 2) : Math.ceil((sd + id) / 3);
      const retryChance = clamp(retryChanceBase, 0, 100);
      const retryLocked = !learned && nextTick < sessionState.maxTicks && randomIntInclusive(1, 100) <= retryChance;
      if (retryLocked) {
        nextLocked[instructorId] = {
          skaterId: skater.id,
          trickType: attempt.trickType,
          maxCoreLevel: plan?.maxCoreLevel || null,
          attempt,
          retryCount: retryCount + 1,
        };
      }

      tickEntries.push({
        id: `lesson-${nextTick}-${instructorId}-${Math.random().toString(16).slice(2, 8)}`,
        tick: nextTick,
        instructorId,
        instructorName: instructor.name,
        skaterId: skater.id,
        skaterName: skater.name,
        pieceLabel: attempt.pieceLabel || targetLabel,
        trickType: attempt.trickType,
        trickName: attempt.trickName,
        status: learned ? "Learned" : landed ? "Landed" : "Bailed",
        landed,
        learned,
        retryLocked,
        retryCount,
        retryBonus,
        retryChance,
        landChance: adjustedLandChance,
        gap: gapInfo.gap,
        isSwitch,
      });

      if (target && !animationPlans.some((item) => item.skaterId === skater.id)) {
        animationPlans.push({
          skaterId: skater.id,
          target,
          trickName: attempt?.trickName || null,
        });
      }
    });

    setPlayerSkaterPool(nextPool);
    setPlayerLessonLandingCounts(nextLandingCounts);

    for (const plan of animationPlans) {
      if (plan.trickName) {
        setSessionState((prev) => ({
          ...prev,
          activeRunTricks: {
            ...prev.activeRunTricks,
            [plan.skaterId]: plan.trickName,
          },
        }));
      }
      await animateSkaterOnTarget(plan.skaterId, plan.target);
      if (plan.trickName) {
        setSessionState((prev) => {
          const nextActive = { ...prev.activeRunTricks };
          delete nextActive[plan.skaterId];
          return {
            ...prev,
            activeRunTricks: nextActive,
          };
        });
      }
    }

    setSessionState((prev) => ({
      ...prev,
      isTickRunning: false,
      isActive: nextTick < prev.maxTicks,
      currentTick: nextTick,
      skaterPositions: nextPositions,
      activeRunTricks: {},
      clock: {
        totalTicks: prev.maxTicks,
        currentTick: nextTick,
        ticksRemaining: Math.max(0, prev.maxTicks - nextTick),
      },
      lesson: {
        ...prev.lesson,
        tickAssignmentsByInstructor: {},
        lockedRetriesByInstructor: nextLocked,
        pendingTickEntries: tickEntries,
        attemptEntries: [...(prev.lesson?.attemptEntries || []), ...tickEntries],
        lowPotentialWarnings: lowWarnings,
      },
    }));

    info(`Lesson tick ${nextTick}/${sessionState.maxTicks} completed.`);
  }, [
    animateSkaterOnTarget,
    gridMode,
    info,
    lessonTargetById,
    lessonTickReady,
    playerInstructors,
    playerLessonLandingCounts,
    playerSkaterPool,
    sessionState.currentTick,
    sessionState.lesson,
    sessionState.maxTicks,
    sessionState.sessionType,
    warning,
  ]);

  const onExecuteVideoTick = useCallback(async () => {
    if (!videoTickReady) {
      warning("Select a route or standalone piece before running the tick.");
      return;
    }
    if (gridMode !== "session" || sessionState.sessionType !== "video") return;
    const targetId = sessionState.video?.selectedTargetId;
    const target = targetId ? videoTargetById.get(targetId) : null;
    if (!target) {
      warning("Selected camera target is invalid.");
      return;
    }

    const nextTick = sessionState.currentTick + 1;
    if (nextTick > sessionState.maxTicks) return;

    const tickStartMs = Date.now();
    const assignments = {};
    const startPositions = {};
    const tickAttemptLog = [];
    const runSkaters = [...sessionState.skaters];
    const runTargetStart = target.startCell || (target.runTiles?.[0] || parseTileKey(target.tileKeys?.[0]));

    runSkaters.forEach((skater) => {
      assignments[skater.id] = target.targetId;
      if (runTargetStart) {
        startPositions[skater.id] = { row: runTargetStart.row, col: runTargetStart.col };
      }
    });

    setSessionState((prev) => ({
      ...prev,
      isTickRunning: true,
      currentTick: nextTick,
      assignments,
      skaterPositions: startPositions,
      activeRunTricks: {},
      clock: {
        totalTicks: prev.maxTicks,
        currentTick: nextTick,
        ticksRemaining: Math.max(0, prev.maxTicks - nextTick),
      },
      video: {
        ...prev.video,
        landedReviewPending: false,
      },
    }));

    for (const skater of runSkaters) {
      const priorResultsForSkater = [...sessionState.trickAttempts, ...tickAttemptLog].filter(
        (entry) => entry.skaterId === skater.id
      );
      const attempts = buildTrickAttemptsForRun({
        skater,
        target,
        allSkateparkPieces: allSkateparkRunPieces,
        priorSessionResults: priorResultsForSkater,
        difficultyBiasBoost: 0.75,
        allowGlobalFallback: false,
      });
      const validAttempts = attempts.filter((attempt) => attempt?.type && attempt?.coreName && attempt?.pieceDifficulty);
      const attempt = validAttempts
        .sort((a, b) => ((b.coreLevel * 2) + b.variantLevel) - ((a.coreLevel * 2) + a.variantLevel))[0] || attempts[0];

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
          trickName: attempt?.trickName || "No Attempt",
          pieceName: attempt?.pieceName || target.label,
          pieceCoordinate: attempt?.pieceCoordinate || null,
          pieceDifficulty: attempt?.pieceDifficulty || 0,
          landed: false,
          control: 0,
          trickPoints: 0,
          status: "No Attempt",
        });
        continue;
      }

      const skillLevel = getSkillLevel(skater);
      const { trickDifficulty, trickChance } = getTrickChanceValues({
        coreLevel: attempt.coreLevel,
        variantLevel: attempt.variantLevel,
        pieceDifficulty: attempt.pieceDifficulty,
        skillLevel,
        switchDifficultyIncreasePercent: attempt.switchDifficultyIncreasePercent || 0,
      });
      const landChanceBase = getLandChanceFromTrickChance(trickChance);
      const landChance = applyPieceDifficultyBailPenalty(landChanceBase, attempt.pieceDifficulty);
      const controlRange = getControlRangeForLandChance(landChance);
      const landed = randomIntInclusive(1, 100) <= landChance;
      const control = landed ? randomIntInclusive(controlRange.min, controlRange.max) : 0;
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
      const basePoints = getBasePointsForTrick(attempt.type, attempt.coreLevel, attempt.variantLevel);
      const trickPoints = getTrickPoints({
        basePoints,
        pieceDifficulty: attempt.pieceDifficulty,
        steezeScore,
        landed,
        isRepeatInSession,
        isSwitch: Boolean(attempt.isSwitch),
      });

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
        attemptNumber: 1,
        isSwitch: Boolean(attempt.isSwitch),
        switchDifficultyIncreasePercent: Number(attempt.switchDifficultyIncreasePercent || 0),
        trickTypeRating: skillLevel,
        landed,
        control,
        landChance,
        difficultyScore: trickDifficulty,
        successScore: skillLevel,
        steezeScore,
        resultScore: trickChance,
        basePoints,
        trickPoints,
        status: landed ? "Landed" : "Bailed",
        willRetry: false,
        isRepeatInSession,
      });

      if (attempt?.trickName) {
        setSessionState((prev) => ({
          ...prev,
          activeRunTricks: {
            ...prev.activeRunTricks,
            [skater.id]: attempt.trickName,
          },
        }));
      }
      await animateSkaterOnTarget(skater.id, target);
      if (attempt?.trickName) {
        setSessionState((prev) => {
          const nextActiveRunTricks = { ...prev.activeRunTricks };
          delete nextActiveRunTricks[skater.id];
          return {
            ...prev,
            activeRunTricks: nextActiveRunTricks,
          };
        });
      }
    }

    const elapsedMs = Date.now() - tickStartMs;
    if (elapsedMs < MIN_TICK_DURATION_MS) {
      await sleep(MIN_TICK_DURATION_MS - elapsedMs);
    }

    const landedEntries = tickAttemptLog.filter((entry) => entry.landed && Number(entry.trickPoints || 0) > 0);
    const sessionEndedByTicks = nextTick >= sessionState.maxTicks;

    setSessionState((prev) => ({
      ...prev,
      isTickRunning: false,
      isActive: sessionEndedByTicks ? false : prev.isActive,
      trickAttempts: [...prev.trickAttempts, ...tickAttemptLog],
      currentTickTrickAttempts: tickAttemptLog,
      activeRunTricks: {},
      video: {
        ...prev.video,
        landedReviewPending: landedEntries.length > 0,
      },
    }));

    if (landedEntries.length > 0) {
      openModal({
        modalTitle: "Select Footage",
        buttons: MODAL_BUTTONS.NONE,
        modalContent: (
          <VideoTickReviewModal
            landedEntries={landedEntries}
            onConfirm={(selectedEntries) => {
              let didFillEdit = false;
              setPlayerEdits((prev) => prev.map((edit) => {
                if (edit.id !== sessionState.video?.editId) return edit;
                const nextFootage = [
                  ...(Array.isArray(edit.footage) ? edit.footage : []),
                  ...selectedEntries.map((entry) => ({
                    id: entry.id,
                    tick: entry.tick,
                    skaterId: entry.skaterId,
                    skaterName: entry.skaterName,
                    trickName: entry.trickName,
                    type: entry.type,
                    pieceName: entry.pieceName,
                    pieceCoordinate: entry.pieceCoordinate || null,
                    points: Number(entry.trickPoints || 0),
                  })),
                ];
                didFillEdit = nextFootage.length >= Number(edit.length || 0);
                return {
                  ...edit,
                  footage: nextFootage,
                };
              }));

              setSessionState((prev) => ({
                ...prev,
                isActive: didFillEdit ? false : prev.isActive,
                currentTick: didFillEdit ? prev.maxTicks : prev.currentTick,
                clock: didFillEdit
                  ? { ...prev.clock, currentTick: prev.maxTicks, ticksRemaining: 0 }
                  : prev.clock,
                video: {
                  ...prev.video,
                  landedReviewPending: false,
                },
              }));
              closeModal();
            }}
          />
        ),
      });
    } else if (sessionEndedByTicks) {
      success("Video session ended after 10 ticks.");
    }
  }, [
    allSkateparkRunPieces,
    animateSkaterOnTarget,
    closeModal,
    gridMode,
    openModal,
    playerEdits,
    sessionState,
    success,
    videoTargetById,
    videoTickReady,
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
      activeRunTricks: {},
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
    () => {
      if (gridMode !== "session" || sessionState.isTickRunning) return false;
      if (sessionState.sessionType === "lesson") {
        return !sessionState.lesson?.isPlacementPhase && sessionState.currentTick >= sessionState.maxTicks;
      }
      if (sessionState.sessionType === "video") {
        return !sessionState.isActive && sessionState.currentTick >= sessionState.maxTicks;
      }
      return !sessionState.isActive && sessionState.currentTick >= sessionState.maxTicks;
    },
    [gridMode, sessionState.currentTick, sessionState.isActive, sessionState.isTickRunning, sessionState.lesson, sessionState.maxTicks, sessionState.sessionType]
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
    if (!canEndSession) {
      return warning(
        sessionState.sessionType === "lesson"
          ? "Place all instructors before ending the lesson session."
          : "Session can only be ended after all ticks are complete."
      );
    }
    const completedDayNumber = timeState.dayNumber;
    const completedWeek = Math.floor((completedDayNumber - 1) / DAYS_PER_WEEK) + 1;
    const completedDayName = DAY_NAMES[(completedDayNumber - 1) % DAYS_PER_WEEK];

    const sessionSummary = {
      id: `session-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      week: completedWeek,
      dayNumber: completedDayNumber,
      dayName: completedDayName,
      sessionType: sessionState.sessionType,
      ticks: sessionState.currentTick,
      skaterCount: sessionState.skaters.length,
      attempts: sessionState.sessionType === "lesson"
        ? (sessionState.lesson?.attemptEntries || []).length
        : sessionState.trickAttempts.length,
      recruitedSkaterIds: sessionState.recruitedSkaterIds,
      competition: sessionState.sessionType === "competition" ? sessionState.competition : null,
    };

    const scoreBySkaterId = new Map();
    if (sessionState.sessionType === "lesson") {
      const lessonEntries = Array.isArray(sessionState.lesson?.attemptEntries) ? sessionState.lesson.attemptEntries : [];
      lessonEntries.forEach((entry) => {
        const current = scoreBySkaterId.get(entry.skaterId) || 0;
        scoreBySkaterId.set(entry.skaterId, current + Number(entry.trickPoints || 0));
      });
    } else {
      const trickEntries = Array.isArray(sessionState.trickAttempts) ? sessionState.trickAttempts : [];
      trickEntries.forEach((entry) => {
        const current = scoreBySkaterId.get(entry.skaterId) || 0;
        scoreBySkaterId.set(entry.skaterId, current + Number(entry.trickPoints || 0));
      });
    }

    const competitionPositions = new Map();
    if (sessionState.sessionType === "competition") {
      const ranked = [...(sessionState.skaters || [])]
        .map((skater) => ({
          skaterId: skater.id,
          score: Number(scoreBySkaterId.get(skater.id) || 0),
        }))
        .sort((a, b) => b.score - a.score);
      ranked.forEach((entry, index) => competitionPositions.set(entry.skaterId, index + 1));
    }

    setPlayerSkaterPool((prev) =>
      prev.map((skater) => {
        const participated = (sessionState.skaters || []).some((entry) => entry.id === skater.id);
        if (!participated) return skater;

        const score = Number(scoreBySkaterId.get(skater.id) || 0);
        const logEntry = {
          id: `skater-session-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
          dayNumber: completedDayNumber,
          week: completedWeek,
          dayName: completedDayName,
          sessionType: sessionState.sessionType,
          score,
          finishingPosition:
            sessionState.sessionType === "competition" ? Number(competitionPositions.get(skater.id) || null) : null,
        };
        const sessionLog = Array.isArray(skater.sessionLog) ? [...skater.sessionLog, logEntry] : [logEntry];
        const personalBest = Math.max(Number(skater.personalBest || 0), score);

        return {
          ...skater,
          sessionLog,
          personalBest,
        };
      })
    );

    setTimeState((prev) => {
      const nextDayNumber = prev.dayNumber + 1;
      return {
        ...prev,
        lastSessionDayNumber: prev.dayNumber,
        dayNumber: nextDayNumber,
        sessionsCompleted: prev.sessionsCompleted + 1,
        sessionHistory: [...prev.sessionHistory, sessionSummary],
      };
    });

    setPlayerInstructors((prev) => {
      let next = normalizeInstructorList(prev);

      if (sessionState.sessionType === "lesson") {
        const participatingIds = new Set(sessionState.lesson?.selectedInstructorIds || []);
        next = next.map((instructor) => {
          if (!participatingIds.has(instructor.id)) return instructor;
          return {
            ...instructor,
            lessonSlotsRemaining: Math.max(0, Number(instructor.lessonSlotsRemaining || 0) - 1),
          };
        });
      }

      const nextDayNumber = completedDayNumber + 1;
      const nextDayName = DAY_NAMES[(nextDayNumber - 1) % DAYS_PER_WEEK];
      if (nextDayName === "Wed") {
        next = next.map((instructor) => ({
          ...instructor,
          lessonSlotsRemaining: Number(instructor.lessonSlotsBase || 0),
        }));
      }

      return next;
    });

    if (sessionState.sessionType === "video") {
      setPlayerEdits((prev) => {
        const targetEditId = sessionState.video?.editId;
        if (!targetEditId) return prev;
        return prev.filter((edit) => {
          if (edit.id !== targetEditId) return true;
          const length = Number(edit.length || 0);
          const footageCount = Array.isArray(edit.footage) ? edit.footage.length : 0;
          // Releasing an edit removes it for now.
          return footageCount < length;
        });
      });
    }

    setGridMode("edit");
    setEditMode("build");
    setSessionState(createDefaultSessionState());
    const nextDayNumber = completedDayNumber + 1;
    const nextWeek = Math.floor((nextDayNumber - 1) / DAYS_PER_WEEK) + 1;
    const nextDayName = DAY_NAMES[(nextDayNumber - 1) % DAYS_PER_WEEK];
    success(`Session ended. New day: ${nextDayName}, Week ${nextWeek}.`);
  }, [canEndSession, sessionState, success, timeState.dayNumber, warning]);

  const onEndLessonSession = useCallback(() => {
    if (gridMode !== "session" || sessionState.sessionType !== "lesson") return;
    if (sessionState.lesson?.isPlacementPhase) {
      warning("Place all instructors before ending the lesson session.");
      return;
    }
    if (!canEndSession) {
      warning("Complete all lesson ticks before ending the session.");
      return;
    }

    openModal({
      modalTitle: "Lesson Session Feedback",
      buttons: MODAL_BUTTONS.OK,
      modalContent: (
        <LessonFeedbackModal
          results={{
            entries: sessionState.lesson?.attemptEntries || [],
            lowPotentialWarnings: sessionState.lesson?.lowPotentialWarnings || [],
          }}
        />
      ),
      onClick: () => {
        closeModal();
        onEndSession();
      },
    });
  }, [
    canEndSession,
    closeModal,
    gridMode,
    onEndSession,
    openModal,
    sessionState.lesson,
    sessionState.sessionType,
    warning,
  ]);

  const onEndCompetitionSession = useCallback(() => {
    if (gridMode !== "session" || sessionState.sessionType !== "competition") return;
    if (!canEndSession) {
      warning("Complete all competition ticks before ending the session.");
      return;
    }

    const totals = (sessionState.skaters || []).map((skater) => {
      const points = (sessionState.trickAttempts || [])
        .filter((entry) => entry.skaterId === skater.id)
        .reduce((sum, entry) => sum + Number(entry.trickPoints || 0), 0);
      return {
        skaterId: skater.id,
        skaterName: skater.name,
        points,
      };
    }).sort((a, b) => b.points - a.points);

    const bestTrickEntry = (sessionState.trickAttempts || [])
      .filter((entry) => entry?.landed && Number(entry?.trickPoints || 0) > 0)
      .sort((a, b) => Number(b.trickPoints || 0) - Number(a.trickPoints || 0))[0] || null;

    const bestTrick = bestTrickEntry
      ? {
        trickName: bestTrickEntry.trickName,
        skaterName: bestTrickEntry.skaterName,
        points: Number(bestTrickEntry.trickPoints || 0),
        pieceName: bestTrickEntry.pieceName || bestTrickEntry.targetLabel || "Unknown Piece",
        pieceCoordinate: bestTrickEntry.pieceCoordinate || null,
      }
      : null;

    openModal({
      modalTitle: "Competition Complete",
      buttons: MODAL_BUTTONS.OK,
      modalContent: <CompetitionResultsModal entries={totals} bestTrick={bestTrick} />,
      onClick: () => {
        closeModal();
        onEndSession();
      },
    });
  }, [
    canEndSession,
    closeModal,
    gridMode,
    onEndSession,
    openModal,
    sessionState.sessionType,
    sessionState.skaters,
    sessionState.trickAttempts,
    warning,
  ]);

  const onEndVideoSession = useCallback(() => {
    if (gridMode !== "session" || sessionState.sessionType !== "video") return;
    if (!canEndSession) {
      warning("Complete the video session before ending it.");
      return;
    }
    const activeEdit = playerEdits.find((item) => item.id === sessionState.video?.editId) || null;
    openModal({
      modalTitle: "Video Session Complete",
      buttons: MODAL_BUTTONS.OK,
      modalContent: <VideoSessionResultsModal attempts={sessionState.trickAttempts || []} edit={activeEdit} />,
      onClick: () => {
        closeModal();
        onEndSession();
      },
    });
  }, [
    canEndSession,
    closeModal,
    gridMode,
    onEndSession,
    openModal,
    playerEdits,
    sessionState.sessionType,
    sessionState.trickAttempts,
    sessionState.video?.editId,
    warning,
  ]);

  const onAdvanceTick = useCallback(async () => {
    if (gridMode !== "session" || !sessionState.isActive || sessionState.isTickRunning) return;
    if (sessionState.sessionType === "lesson") return;
    const nextTick = sessionState.currentTick + 1;
    if (nextTick > sessionState.maxTicks) return;

    const tickStartMs = Date.now();
    const difficultyBiasBoost = sessionState.sessionType === "competition" ? 0.35 : 0;

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
          difficultyBiasBoost,
          allowGlobalFallback: false,
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
      activeRunTricks: {},
      clock: {
        totalTicks: sessionState.maxTicks,
        currentTick: nextTick,
        ticksRemaining: Math.max(0, sessionState.maxTicks - nextTick),
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
              difficultyBiasBoost,
              allowGlobalFallback: false,
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
            isSwitch: Boolean(attempt?.isSwitch),
            switchDifficultyIncreasePercent: Number(attempt?.switchDifficultyIncreasePercent || 0),
            landed: false,
            control: 0,
            landChance: 0,
            difficultyScore: 0,
            successScore: 0,
            steezeScore: 1,
            resultScore: 0,
            basePoints: 0,
            trickPoints: 0,
            status: "No Attempt",
            willRetry: false,
            isRepeatInSession: false,
          });
          return;
        }

        const skillLevel = getSkillLevel(skater);
        const {
          trickDifficulty,
          trickChance,
        } = getTrickChanceValues({
          coreLevel: attempt.coreLevel,
          variantLevel: attempt.variantLevel,
          pieceDifficulty: attempt.pieceDifficulty,
          skillLevel,
          switchDifficultyIncreasePercent: attempt.switchDifficultyIncreasePercent || 0,
        });
        const landChanceBase = getLandChanceFromTrickChance(trickChance);
        const landChance = applyPieceDifficultyBailPenalty(landChanceBase, attempt.pieceDifficulty);
        const controlRange = getControlRangeForLandChance(landChance);
        const landed = randomIntInclusive(1, 100) <= landChance;
        const control = landed ? randomIntInclusive(controlRange.min, controlRange.max) : 0;
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
        const basePoints = getBasePointsForTrick(attempt.type, attempt.coreLevel, attempt.variantLevel);
        const trickPoints = getTrickPoints({
          basePoints,
          pieceDifficulty: attempt.pieceDifficulty,
          steezeScore,
          landed,
          isRepeatInSession,
          isSwitch: Boolean(attempt.isSwitch),
        });

        info(
          `${skater.name}: ${attempt.trickName} on ${attempt.pieceName} - ${landed ? "Landed" : "Bailed"}`
        );

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
          isSwitch: Boolean(attempt.isSwitch),
          switchDifficultyIncreasePercent: Number(attempt.switchDifficultyIncreasePercent || 0),
          trickTypeRating: skillLevel,
          landed,
          control,
          landChance,
          difficultyScore: trickDifficulty,
          successScore: skillLevel,
          steezeScore,
          resultScore: trickChance,
          basePoints,
          trickPoints,
          status: landed ? "Landed" : "Bailed",
          willRetry,
          isRepeatInSession,
        });
      });

      const activeTrickLabel = attempts.find((attempt) => attempt?.type && attempt?.trickName)?.trickName || null;
      if (activeTrickLabel) {
        setSessionState((prev) => ({
          ...prev,
          activeRunTricks: {
            ...prev.activeRunTricks,
            [skater.id]: activeTrickLabel,
          },
        }));
      }

      await animateSkaterOnTarget(skater.id, target);

      if (activeTrickLabel) {
        setSessionState((prev) => {
          const nextActiveRunTricks = { ...prev.activeRunTricks };
          delete nextActiveRunTricks[skater.id];
          return {
            ...prev,
            activeRunTricks: nextActiveRunTricks,
          };
        });
      }
    }

    const elapsedMs = Date.now() - tickStartMs;
    if (elapsedMs < MIN_TICK_DURATION_MS) {
      await sleep(MIN_TICK_DURATION_MS - elapsedMs);
    }

    const sessionEnded = nextTick >= sessionState.maxTicks;
    setSessionState((prev) => ({
      ...prev,
      isTickRunning: false,
      isActive: sessionEnded ? false : prev.isActive,
      assignments: sessionEnded ? {} : prev.assignments,
      skaterPositions: sessionEnded ? {} : prev.skaterPositions,
      trickAttempts: [...prev.trickAttempts, ...tickAttemptLog],
      currentTickTrickAttempts: tickAttemptLog,
      retryQueue: sessionEnded ? {} : retryQueue,
      activeRunTricks: {},
    }));

    if (sessionEnded) {
      success(
        sessionState.sessionType === "competition"
          ? "Competition session ended after 10 ticks."
          : `Session ended after ${sessionState.maxTicks} ticks.`
      );
    }
  }, [
    animateSkaterOnTarget,
    gridMode,
    sessionState,
    allSkateparkRunPieces,
    info,
    startingTargetById,
    startingTargets,
    success,
  ]);

  useEffect(() => {
    if (gridMode !== "session") return;
    if (sessionState.sessionType === "lesson" || sessionState.sessionType === "video") return;
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
    instructorMarkers,
    cameraMarkers,
    standalonePieces,
    routePieces,
    sessionState,
    sessionTimeline,
    sessionRunDisplay,
    sessionAttemptLog,
    timeState,
    currentWeek,
    currentDayName,
    hasSessionAvailableToday,
    playerSkaterPool,
    playerInstructors,
    canStartBeginnerSession,
    canStartNormalSession,
    canStartLessonSession,
    canStartCompetitionSession,
    canStartVideoSession,
    lessonTickReady,
    videoTickReady,
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
    onStartLessonSession,
    onStartCompetitionSession,
    onStartVideoSession,
    onRecruitBeginnerSkater,
    onEndSession,
    onEndLessonSession,
    onEndCompetitionSession,
    onEndVideoSession,
    onSelectLessonInstructorForPlacement,
    onUpdateLessonTickAssignment,
    onRandomizeLessonTickAssignments,
    onExecuteLessonTick,
    onExecuteVideoTick,
    onOpenEditsModal,
    onGoToEditMode,
    getDropPreviewTiles,
    lessonState,
    lessonSelectedInstructors,
    lessonSelectedSkaters,
    lessonHighlightTileKeys,
    lessonTrickTypeOptionsByInstructor,
  };
};
