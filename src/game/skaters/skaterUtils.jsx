import {
  buildGeneratedTrickLibrary,
  getMaxTypeCostBySport,
  getTypeRatingsForSkater,
  recalculateSkaterTypeRatings,
} from "./trickLibraryUtils";

const FIRST_NAMES = ["Alex", "Mia", "Noah", "Zoe", "Liam", "Eva", "Jade", "Cole", "Ivy", "Finn"];
const LAST_NAMES = ["Mercer", "Hart", "Price", "Quinn", "Ford", "Stone", "Vale", "Bishop", "Reed", "Cross"];

const SKATER_COLORS = ["#f59e0b", "#38bdf8", "#a78bfa", "#34d399", "#fb7185", "#f97316", "#22c55e", "#0ea5e9"];

export const SKATER_SPORT = Object.freeze({
  ROLLERBLADER: "Rollerblader",
  SKATEBOARDER: "Skateboarder",
});

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFrom = (items) => items[randInt(0, items.length - 1)];
const weightedLowInt = (min, max, power = 1.75) => min + Math.floor(Math.pow(Math.random(), power) * (max - min + 1));
const makeId = () => `skater-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const makeInitials = (name) => {
  const [first, last] = name.split(" ");
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getRatingPercent = (skater, type) => {
  const rating = Number(skater[type] || 0);
  const maxByType = getMaxTypeCostBySport(skater.sport || SKATER_SPORT.SKATEBOARDER);
  const typeMax = Number(maxByType[type] || 1);
  if (typeMax <= 0) return 0;
  return clamp(Math.round((rating / typeMax) * 100), 0, 100);
};

const computePotentialFromPercent = (ratingPercent, minCap = 20) => {
  const floor = Math.max(minCap, ratingPercent + 1);
  if (floor >= 100) return 100;
  return randInt(floor, 100);
};

const withDerivedRatings = (base) => {
  const ratings = getTypeRatingsForSkater(base);
  const derived = recalculateSkaterTypeRatings({ ...base, ...ratings });
  return {
    ...base,
    ...ratings,
    skillLevel: derived.skillLevel,
  };
};

const withPotentials = (skater) => {
  const common = {
    stallPotential: computePotentialFromPercent(getRatingPercent(skater, "stall")),
    grindPotential: computePotentialFromPercent(getRatingPercent(skater, "grind")),
    bigAirPotential: computePotentialFromPercent(getRatingPercent(skater, "bigAir")),
  };

  if (skater.sport === SKATER_SPORT.ROLLERBLADER) {
    return {
      ...skater,
      ...common,
      techPotential: computePotentialFromPercent(getRatingPercent(skater, "tech")),
      spinPotential: computePotentialFromPercent(getRatingPercent(skater, "spin")),
    };
  }

  return {
    ...skater,
    ...common,
    techPotential: computePotentialFromPercent(getRatingPercent(skater, "tech")),
    spinPotential: computePotentialFromPercent(getRatingPercent(skater, "spin")),
  };
};

const generateSkater = ({ sport, tier, energyMin, energyMax, weightedEnergy = false }) => {
  const safeSport = Object.values(SKATER_SPORT).includes(sport) ? sport : SKATER_SPORT.SKATEBOARDER;
  const name = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
  const trickLibrary = buildGeneratedTrickLibrary({ sport: safeSport, tier });

  const switchRating = randInt(1, 9);
  const base = {
    id: makeId(),
    name,
    initials: makeInitials(name),
    color: randomFrom(SKATER_COLORS),
    type: tier,
    sport: safeSport,
    baseEnergy: weightedEnergy ? weightedLowInt(energyMin, energyMax) : randInt(energyMin, energyMax),
    determination: randInt(1, 100),
    steezeRating: 5,
    baseSteeze: randInt(1, 10),
    switchRating,
    switchPotential: randInt(Math.min(10, switchRating + 1), 10),
    trickLibrary,
  };

  const withRatings = withDerivedRatings(base);
  const withTierRules = tier === "Beginner" ? { ...withRatings, bigAir: 0 } : withRatings;
  return withPotentials(withTierRules);
};

export const generateBeginnerSkater = (sport) =>
  generateSkater({
    sport,
    tier: "Beginner",
    energyMin: 3,
    energyMax: 10,
    weightedEnergy: true,
  });

export const generateMediumSkater = (sport) =>
  generateSkater({
    sport,
    tier: "Medium",
    energyMin: 6,
    energyMax: 12,
  });

export const generateProSkater = (sport) =>
  generateSkater({
    sport,
    tier: "Pro",
    energyMin: 10,
    energyMax: 15,
  });

export const shuffleItems = (items) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const randomIntInclusive = randInt;
