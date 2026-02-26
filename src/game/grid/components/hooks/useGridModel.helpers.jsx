import { SKATER_SPORT, randomIntInclusive } from "../../../skaters/skaterUtils";
import { makeModifierKey } from "../../../skaters/trickNameUtils";
import { getMaxTypeCostBySport, getTypeRatingsForSkater } from "../../../skaters/trickLibraryUtils";
import { TRICK_TREES } from "../../../../assets/gameContent/tricks/trickTrees";
import { hasRouteType, toCoordinate } from "./gridUtils";
import { getOppositeDirection } from "./pieceImageUtils";
import {
  DEFAULT_TIME_STATE,
  LESSON_RETRY_LAND_BONUS,
  SESSION_CLOCK_DEFAULT,
  SESSION_TICKS,
  TRICK_POINTS_MATRIX,
} from "./useGridModel.constants";

const SPORT_DIFFICULTY_KEY = {
  [SKATER_SPORT.ROLLERBLADER]: "rollerblader",
  [SKATER_SPORT.SKATEBOARDER]: "skateboarder",
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const toNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getMiddleSpeedInvalidReason = (piece, currentSpeed) => {
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

export const getRouteSpeedAfterPieces = (pieces) => {
  if (!Array.isArray(pieces) || pieces.length < 1) return 0;
  const startDropSpeed = Math.max(0, toNumeric(pieces[0]?.dropSpeed) || 0);
  const middleCost = pieces
    .slice(1)
    .filter((piece) => hasRouteType(piece, "Middle"))
    .reduce((sum, piece) => sum + Math.max(0, toNumeric(piece.speedCost) || 0), 0);
  return Math.max(0, startDropSpeed - middleCost);
};

export const getInitialsFromName = (name) => {
  if (typeof name !== "string") return "IN";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 1) return "IN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
};

export const getLessonRetryLandBonus = (retryCount) => {
  const safeRetryCount = Math.max(0, Number(retryCount) || 0);
  if (safeRetryCount >= 5) return 25;
  return LESSON_RETRY_LAND_BONUS[safeRetryCount] || 0;
};

export const getSportDifficultyValue = (pieceDifficulty, sport, trickType) => {
  const sportKey = SPORT_DIFFICULTY_KEY[sport] || SPORT_DIFFICULTY_KEY[SKATER_SPORT.SKATEBOARDER];
  const raw = Number(pieceDifficulty?.[sportKey]?.[trickType]);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
};

export const getTypePercent = (skater, trickType) => {
  const ratings = getTypeRatingsForSkater(skater);
  const maxByType = getMaxTypeCostBySport(skater?.sport || SKATER_SPORT.SKATEBOARDER);
  const rating = Number(ratings?.[trickType] || 0);
  const max = Number(maxByType?.[trickType] || 1);
  if (max <= 0) return 0;
  return clamp(Math.round((rating / max) * 100), 0, 100);
};

export const getPotentialForType = (skater, trickType) => {
  const key = `${trickType}Potential`;
  return clamp(Number(skater?.[key] || 0), 0, 100);
};

export const getAttemptGapChance = (potential, currentPercent) => {
  const gap = potential - currentPercent;
  if (gap < 1) return { gap, chance: 0, mode: "blocked" };
  if (gap < 6) return { gap, chance: 2, mode: "low" };
  if (gap < 13) return { gap, chance: 5, mode: "low" };
  return { gap, chance: null, mode: "normal" };
};

export const getCoreNodeByName = (sport, trickType, coreName) =>
  (TRICK_TREES?.[sport]?.[trickType] || []).find((node) => node.core === coreName);

export const getModifierNodeByKey = (coreNode, modifierKey) =>
  (coreNode?.modifiers || []).find((node) => makeModifierKey({
    parentVariant: node.parentVariant || node.name,
    name: node.name,
  }) === modifierKey);

export const getLearningCountKey = (skaterId, comboKey) => `${skaterId}|${comboKey}`;

export const getSkillLevel = (skater) => clamp(Number(skater?.skillLevel || 1), 1, 100);

export const getTrickChanceValues = ({
  coreLevel,
  variantLevel,
  pieceDifficulty,
  skillLevel,
  switchDifficultyIncreasePercent = 0,
}) => {
  const baseTrickDifficulty = Math.max(0, (Math.max(1, Number(coreLevel) || 1) * 5) + Math.max(0, Number(variantLevel) || 0));
  const pieceDifficultyValue = Math.max(0, (Math.max(1, Number(pieceDifficulty) || 1) - 1) * 9);
  const trickDifficultyBase = baseTrickDifficulty + pieceDifficultyValue;
  const trickDifficulty = Math.round(trickDifficultyBase * (1 + (Math.max(0, Number(switchDifficultyIncreasePercent) || 0) / 100)));
  const trickChance = Math.max(0, trickDifficulty - Math.max(1, Number(skillLevel) || 1));

  return {
    baseTrickDifficulty,
    pieceDifficultyValue,
    trickDifficultyBase,
    trickDifficulty,
    trickChance,
  };
};

export const getLandChanceFromTrickChance = (trickChance) => {
  let chance = 1;
  if (trickChance <= 0) chance = 95;
  else if (trickChance <= 5) chance = 90;
  else if (trickChance <= 10) chance = 70;
  else if (trickChance <= 15) chance = 50;
  else if (trickChance <= 25) chance = 30;
  else if (trickChance <= 50) chance = 10;
  return Math.max(0, chance - 5);
};

export const applyPieceDifficultyBailPenalty = (landChance, pieceDifficulty) => {
  const pd = Math.max(1, Number(pieceDifficulty) || 1);
  const penalty = (pd - 1) * 2;
  return Math.max(0, Math.round(landChance - penalty));
};

export const getControlRangeForLandChance = (landChance) => {
  if (landChance >= 95) return { min: 80, max: 100 };
  if (landChance >= 90) return { min: 70, max: 95 };
  if (landChance >= 70) return { min: 50, max: 85 };
  if (landChance >= 50) return { min: 35, max: 75 };
  if (landChance >= 30) return { min: 20, max: 55 };
  if (landChance >= 10) return { min: 10, max: 40 };
  return { min: 1, max: 25 };
};

export const getBasePointsForTrick = (type, coreLevel, variantLevel) => {
  const typeKey = String(type || "").trim();
  const core = Math.max(1, Math.min(3, Number(coreLevel) || 1));
  const variant = Math.max(0, Math.min(10, Number(variantLevel) || 0));
  const row = TRICK_POINTS_MATRIX[typeKey]?.[core];
  if (!Array.isArray(row)) return 0;
  return Number(row[variant] || 0);
};

export const getTrickPoints = ({ basePoints, pieceDifficulty, steezeScore, landed, isRepeatInSession, isSwitch }) => {
  if (!landed || basePoints <= 0) return 0;
  const pd = Math.max(0, Number(pieceDifficulty) || 0);
  const st = Math.max(0, Number(steezeScore) || 0);
  const baseScore = basePoints * ((pd / 2) + (st / 10));
  let multiplier = 1;
  if (isRepeatInSession) multiplier *= 0.8;
  if (isSwitch) multiplier *= 1.2;
  return Math.round(baseScore * multiplier);
};

export const getTrickSteezeScore = ({ skaterSteezeRating, control }) => {
  const base = clamp(Number(skaterSteezeRating) || 1, 1, 10) * 10;
  const safeControl = clamp(Number(control) || 0, 0, 100);

  let score = base;
  if (safeControl >= 90) score += (safeControl - 90) * 1.5;
  else if (safeControl >= 80) score -= (90 - safeControl) * 0.4;
  else if (safeControl >= 70) score -= 4 + ((80 - safeControl) * 1.2);
  else if (safeControl >= 50) score -= 16 + ((70 - safeControl) * 1.8);
  else score -= 52 + ((50 - safeControl) * 2.2);

  score += randomIntInclusive(-7, 7);
  return clamp(Math.round(score), 1, 100);
};

export const parseCoordinate = (coordinate) => {
  if (typeof coordinate !== "string" || coordinate.length < 2) return null;
  const rowChar = coordinate[0].toUpperCase();
  const colRaw = Number(coordinate.slice(1));
  if (!Number.isInteger(colRaw) || colRaw < 1) return null;
  const row = rowChar.charCodeAt(0) - 65;
  const col = colRaw - 1;
  if (row < 0) return null;
  return { row, col };
};

export const normalizeInstructorLessonSlots = (instructor) => {
  const base = Math.max(0, Number(instructor?.lessonSlotsBase ?? instructor?.lessonSlots ?? 0));
  const remainingRaw = instructor?.lessonSlotsRemaining;
  const remaining = remainingRaw === undefined || remainingRaw === null
    ? base
    : Math.max(0, Number(remainingRaw));

  return {
    ...instructor,
    lessonSlotsBase: base,
    lessonSlotsRemaining: Math.min(base, remaining),
  };
};

export const normalizeInstructorList = (instructors) => {
  if (!Array.isArray(instructors)) return [];
  let changed = false;
  const normalized = instructors.map((instructor) => {
    const next = normalizeInstructorLessonSlots(instructor);
    const sameBase = Number(instructor?.lessonSlotsBase) === next.lessonSlotsBase;
    const sameRemaining = Number(instructor?.lessonSlotsRemaining) === next.lessonSlotsRemaining;
    if (sameBase && sameRemaining) return instructor;
    changed = true;
    return next;
  });
  return changed ? normalized : instructors;
};

export const parseTileKey = (tileKey) => {
  if (typeof tileKey !== "string") return null;
  const [rowRaw, colRaw] = tileKey.split("-");
  const row = Number(rowRaw);
  const col = Number(colRaw);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { row, col };
};

export const parseSize = (sizeRaw) => {
  if (typeof sizeRaw !== "string") return null;
  const [rowsRaw, colsRaw] = sizeRaw.toLowerCase().split("x");
  const rows = Number(rowsRaw);
  const cols = Number(colsRaw);
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) return null;
  return { rows, cols };
};

export const normalizeTimeState = (timeState) => {
  if (!timeState || typeof timeState !== "object") return DEFAULT_TIME_STATE;
  const dayNumber = Math.max(1, Number(timeState.dayNumber) || 1);
  const lastSessionDayNumber = Math.max(0, Number(timeState.lastSessionDayNumber) || 0);
  const sessionsCompleted = Math.max(0, Number(timeState.sessionsCompleted) || 0);
  const sessionHistory = Array.isArray(timeState.sessionHistory) ? timeState.sessionHistory : [];
  const sessionSchedule = Array.isArray(timeState.sessionSchedule) ? timeState.sessionSchedule : [];

  return {
    dayNumber,
    lastSessionDayNumber,
    sessionsCompleted,
    sessionHistory,
    sessionSchedule,
  };
};

export const getRouteDirectionFromPieces = (pieces, explicitDirection = null) => {
  if (explicitDirection) return explicitDirection;
  if (!Array.isArray(pieces) || pieces.length < 2) return "south";

  const [start, next] = pieces;
  if (next.row === start.row - 1 && next.col === start.col) return "north";
  if (next.row === start.row + 1 && next.col === start.col) return "south";
  if (next.row === start.row && next.col === start.col + 1) return "east";
  if (next.row === start.row && next.col === start.col - 1) return "west";
  return "south";
};

export const getPieceFacingDirection = (piece, isStart, isEnd, routeDirection) => {
  const opposite = getOppositeDirection(routeDirection) || routeDirection;
  if (isStart && isEnd) return routeDirection;
  if (hasRouteType(piece, "Middle")) return opposite;
  if (isEnd) return opposite;
  if (isStart) return routeDirection;
  return routeDirection;
};

export const buildRoutePiece = (piece, row, col) => ({
  ...piece,
  row,
  col,
  coordinates: toCoordinate(row, col),
});

export const makeStandaloneSkateparkEntry = (instance) => ({
  id: instance.instanceId,
  Name: instance.name,
  Type: "Standalone",
  Size: `${instance.size.rows}x${instance.size.cols}`,
  Coordinates: toCoordinate(instance.topLeft.row, instance.topLeft.col),
  StartingSpots: instance.startingSpots,
  TrickOpportunities: instance.trickOpportunities || 0,
  Difficulty: instance.difficulty || null,
});

export const makeRouteSkateparkEntry = (route) => ({
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

export const withSessionTiming = (skater) => {
  const energy = Math.max(1, Math.min(15, skater.baseEnergy || 3));
  const latestArrivalTick = Math.max(1, SESSION_TICKS - energy);
  return {
    ...skater,
    energy,
    arrivalTick: randomIntInclusive(1, latestArrivalTick),
  };
};

export const createDefaultSessionState = () => ({
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
  activeRunTricks: {},
  competition: {
    sport: null,
    level: null,
    slots: 0,
    sponsoredCount: 0,
  },
  video: {
    editId: null,
    selectedTargetId: null,
    sport: null,
    landedReviewPending: false,
  },
  lesson: {
    isPlacementPhase: false,
    activePlacementInstructorId: null,
    selectedInstructorIds: [],
    selectedSkaterIds: [],
    selectedSkaterByInstructor: {},
    placementsByInstructor: {},
    tickAssignmentsByInstructor: {},
    lockedRetriesByInstructor: {},
    attemptEntries: [],
    lowPotentialWarnings: [],
    pendingTickEntries: [],
  },
  clock: SESSION_CLOCK_DEFAULT,
});
