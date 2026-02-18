const FIRST_NAMES = ["Alex", "Mia", "Noah", "Zoe", "Liam", "Eva", "Jade", "Cole", "Ivy", "Finn"];
const LAST_NAMES = ["Mercer", "Hart", "Price", "Quinn", "Ford", "Stone", "Vale", "Bishop", "Reed", "Cross"];

const SKATER_COLORS = ["#f59e0b", "#38bdf8", "#a78bfa", "#34d399", "#fb7185", "#f97316", "#22c55e", "#0ea5e9"];

export const SKATER_SPORT = Object.freeze({
  ROLLERBLADER: "Rollerblader",
  SKATEBOARDER: "Skateboarder",
});

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFrom = (items) => items[randInt(0, items.length - 1)];

const weightedLowInt = (min, max, power = 1.75) => {
  const normalized = Math.pow(Math.random(), power);
  return min + Math.floor(normalized * (max - min + 1));
};

const makeSkillFromPotential = (potential) => {
  const raw = randInt(1, 20);
  const boostWindow = Math.floor(((potential - 20) / 80) * 8);
  const bonus = boostWindow > 0 ? randInt(0, boostWindow) : 0;
  const value = Math.min(20, raw + bonus);
  return Math.max(1, Math.min(value, Math.max(1, potential - 1)));
};

const computeSkillLevel = (stats) => {
  const total = stats.stall + stats.grind + (stats.tech || stats.flip || 0) + (stats.spin || stats.grab || 0) + stats.bigAir;
  return Math.max(1, Math.floor(total / 5));
};

const makeInitials = (name) => {
  const [first, last] = name.split(" ");
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
};

const makeId = () => `skater-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const generateBeginnerSkater = (sport) => {
  const safeSport = Object.values(SKATER_SPORT).includes(sport) ? sport : SKATER_SPORT.SKATEBOARDER;
  const name = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;

  const stallPotential = randInt(20, 100);
  const grindPotential = randInt(20, 100);
  const specialPotentialA = randInt(20, 100);
  const specialPotentialB = randInt(20, 100);
  const bigAirPotential = randInt(20, 100);

  const commonStats = {
    stall: makeSkillFromPotential(stallPotential),
    grind: makeSkillFromPotential(grindPotential),
    bigAir: 0,
    stallPotential,
    grindPotential,
    bigAirPotential,
  };

  const trickStats =
    safeSport === SKATER_SPORT.ROLLERBLADER
      ? {
          ...commonStats,
          tech: makeSkillFromPotential(specialPotentialA),
          spin: makeSkillFromPotential(specialPotentialB),
          techPotential: specialPotentialA,
          spinPotential: specialPotentialB,
        }
      : {
          ...commonStats,
          flip: makeSkillFromPotential(specialPotentialA),
          grab: makeSkillFromPotential(specialPotentialB),
          flipPotential: specialPotentialA,
          grabPotential: specialPotentialB,
        };

  return {
    id: makeId(),
    name,
    initials: makeInitials(name),
    color: randomFrom(SKATER_COLORS),
    type: "Beginner",
    sport: safeSport,
    baseEnergy: weightedLowInt(3, 10),
    determination: randInt(1, 100),
    steezeRating: 5,
    baseSteeze: randInt(1, 10),
    switchRating: randInt(1, 3),
    switchPotential: randInt(3, 10),
    ...trickStats,
    skillLevel: computeSkillLevel(trickStats),
  };
};

export const shuffleItems = (items) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const randomIntInclusive = randInt;
