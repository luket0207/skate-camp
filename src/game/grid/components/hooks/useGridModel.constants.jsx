export const SESSION_TICKS = 20;
export const LESSON_SESSION_TICKS = 10;
export const COMPETITION_SESSION_TICKS = 10;
export const VIDEO_SESSION_TICKS = 10;
export const RUN_DURATION_MS = 2000;
export const MIN_TICK_DURATION_MS = 500;
export const DAYS_PER_WEEK = 5;
export const DAY_NAMES = ["Wed", "Thu", "Fri", "Sat", "Sun"];
export const MAX_PLAYABLE_GRID_SIZE = 9;

export const SESSION_CLOCK_DEFAULT = {
  totalTicks: SESSION_TICKS,
  ticksRemaining: SESSION_TICKS,
  currentTick: 0,
};
export const LESSON_CLOCK_DEFAULT = {
  totalTicks: LESSON_SESSION_TICKS,
  ticksRemaining: LESSON_SESSION_TICKS,
  currentTick: 0,
};
export const COMPETITION_CLOCK_DEFAULT = {
  totalTicks: COMPETITION_SESSION_TICKS,
  ticksRemaining: COMPETITION_SESSION_TICKS,
  currentTick: 0,
};
export const VIDEO_CLOCK_DEFAULT = {
  totalTicks: VIDEO_SESSION_TICKS,
  ticksRemaining: VIDEO_SESSION_TICKS,
  currentTick: 0,
};

export const DEFAULT_TIME_STATE = {
  dayNumber: 1,
  lastSessionDayNumber: 0,
  sessionsCompleted: 0,
  sessionHistory: [],
  sessionSchedule: [],
};

export const TRICK_POINTS_MATRIX = {
  stall: {
    1: [10, 15, 24, 37, 57, 88, 136, 210, 324, 400, 500],
    2: [20, 31, 48, 74, 114, 176, 271, 419, 647, 800, 1000],
    3: [40, 62, 95, 147, 228, 352, 543, 838, 1295, 1600, 2000],
  },
  grind: {
    1: [100, 129, 167, 215, 278, 359, 464, 599, 774, 900, 1000],
    2: [250, 323, 417, 539, 696, 898, 1160, 1499, 1936, 2250, 2500],
    3: [500, 646, 834, 1077, 1391, 1797, 2321, 2997, 3871, 4500, 5000],
  },
  tech: {
    1: [100, 129, 167, 215, 278, 359, 464, 599, 774, 900, 1000],
    2: [250, 323, 417, 539, 696, 898, 1160, 1499, 1936, 2250, 2500],
    3: [500, 646, 834, 1077, 1391, 1797, 2321, 2997, 3871, 4500, 5000],
  },
  spin: {
    1: [100, 129, 167, 215, 278, 359, 464, 599, 774, 900, 1000],
    2: [500, 598, 715, 855, 1022, 1223, 1462, 1748, 2091, 2300, 2500],
    3: [1000, 1196, 1430, 1710, 2045, 2445, 2924, 3497, 4181, 4600, 5000],
  },
  bigAir: {
    1: [1000, 1196, 1430, 1710, 2045, 2445, 2924, 3497, 4181, 4600, 5000],
    2: [2500, 2825, 3191, 3606, 4074, 4603, 5200, 5875, 6638, 7300, 8000],
    3: [5000, 5400, 5833, 6300, 6804, 7349, 7937, 8572, 9259, 9600, 10000],
  },
};

export const TYPE_KEYS = ["stall", "grind", "tech", "spin", "bigAir"];

export const SWITCH_CHANCE_BY_RATING = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 5,
  6: 5,
  7: 10,
  8: 10,
  9: 20,
  10: 20,
};

export const LESSON_RETRY_LAND_BONUS = {
  0: 0,
  1: 5,
  2: 10,
  3: 15,
  4: 20,
};
