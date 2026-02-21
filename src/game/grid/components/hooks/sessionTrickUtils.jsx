import { buildTrickName, makeModifierKey } from "../../../skaters/trickNameUtils";
import { getTypeRatingsForSkater } from "../../../skaters/trickLibraryUtils";

const difficultyKeysBySport = {
  Rollerblader: ["stall", "grind", "tech", "spin", "bigAir"],
  Skateboarder: ["stall", "grind", "tech", "spin", "bigAir"],
};

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const SWITCH_CHANCE_BY_RATING = {
  1: 1,
  2: 2,
  3: 4,
  4: 6,
  5: 8,
  6: 10,
  7: 25,
  8: 30,
  9: 35,
  10: 40,
};
const SWITCH_DIFFICULTY_INCREASE_BY_RATING = {
  1: 100,
  2: 89,
  3: 79,
  4: 68,
  5: 58,
  6: 47,
  7: 37,
  8: 26,
  9: 16,
  10: 5,
};
const getSwitchChancePercent = (switchRating) => SWITCH_CHANCE_BY_RATING[clamp(Number(switchRating) || 1, 1, 10)] || 1;
const getSwitchDifficultyIncreasePercent = (switchRating) =>
  SWITCH_DIFFICULTY_INCREASE_BY_RATING[clamp(Number(switchRating) || 1, 1, 10)] || 100;

const pickWeighted = (weightedItems) => {
  const total = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return randomFrom(weightedItems)?.value;
  let roll = Math.random() * total;
  for (const item of weightedItems) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return weightedItems[weightedItems.length - 1]?.value;
};

const toNumeric = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getPieceDifficulty = (piece, sport, type) => {
  const difficulty = piece?.difficulty?.[sport === "Rollerblader" ? "rollerblader" : "skateboarder"];
  if (!difficulty) return null;
  let value = toNumeric(difficulty[type]);
  if (sport === "Skateboarder" && value === null) {
    // Backward compatibility for piece data that still uses old keys.
    if (type === "tech") value = toNumeric(difficulty.flip);
    if (type === "spin") value = toNumeric(difficulty.grab);
  }
  return value === null ? null : Math.max(0, value);
};

const getSkaterRatingForType = (skater, type) => {
  const ratings = getTypeRatingsForSkater(skater || {});
  return Math.max(0, Number(ratings[type] || 0));
};
const getSkillLevel = (skater) => Math.max(1, Math.min(100, Number(skater?.skillLevel || 1)));
const canAttemptBySkill = (skillLevel, pieceDifficulty) => skillLevel >= ((pieceDifficulty - 2) * 10);

const buildTypeWeights = (types, skater) => {
  if (types.length === 1) return [{ type: types[0], weight: 1 }];
  const raw = types.map((type) => ({ type, value: getSkaterRatingForType(skater, type) }));
  const total = raw.reduce((sum, item) => sum + item.value, 0);
  const normalized = total > 0
    ? raw.map((item) => ({ type: item.type, weight: item.value / total }))
    : raw.map((item) => ({ type: item.type, weight: 1 / raw.length }));
  const best = [...normalized].sort((a, b) => b.weight - a.weight)[0];
  if (!best || best.weight <= 0.5) return normalized;
  const rest = normalized.filter((item) => item.type !== best.type);
  const restTotal = rest.reduce((sum, item) => sum + item.weight, 0);
  return [{ type: best.type, weight: 0.5 }, ...rest.map((item) => ({ type: item.type, weight: restTotal > 0 ? (item.weight / restTotal) * 0.5 : 0.5 / rest.length }))];
};

const getCoreTricksForType = (skater, type) =>
  (Array.isArray(skater?.trickLibrary) ? skater.trickLibrary : []).filter((entry) => entry.type === type);

const getCoreDifficultyScore = (coreEntry) => {
  const coreLevel = Number(coreEntry?.coreLevel || 1);
  const modifiers = Array.isArray(coreEntry?.modifiers) ? coreEntry.modifiers : [];
  const sorted = [...modifiers]
    .map((modifier) => Number(modifier?.level || 0))
    .sort((a, b) => b - a);
  const topTwo = sorted.slice(0, 2).reduce((sum, level) => sum + level, 0);
  return (coreLevel * 2) + topTwo + (modifiers.length * 0.5);
};

const getVariantOptionsForCore = (coreEntry) => {
  const modifiers = Array.isArray(coreEntry?.modifiers) ? coreEntry.modifiers : [];
  const none = [{ variants: [], count: 0 }];
  if (modifiers.length < 1) return none;

  const singles = modifiers.map((modifier) => ({ variants: [modifier], count: 1 }));
  const doubles = [];
  for (let i = 0; i < modifiers.length; i += 1) {
    for (let j = i + 1; j < modifiers.length; j += 1) {
      if ((modifiers[i].parentVariant || modifiers[i].name) === (modifiers[j].parentVariant || modifiers[j].name)) continue;
      doubles.push({ variants: [modifiers[i], modifiers[j]], count: 2 });
    }
  }
  return [...none, ...singles, ...doubles];
};

const makeTrickComboKey = (pieceName, pieceCoordinate, type, coreName, modifiers) =>
  `${pieceName}|${pieceCoordinate || "none"}|${type}|${coreName}|${modifiers.map(makeModifierKey).sort().join("+")}`;

const pickVariantComboForCore = (options, attemptedComboKeys, piece, type, coreName, difficultyBias) => {
  const optionsWithKeys = options.map((option) => ({
    ...option,
    comboKey: makeTrickComboKey(piece.name, piece.coordinate, type, coreName, option.variants),
  }));
  const freshOptions = optionsWithKeys.filter((option) => !attemptedComboKeys.has(option.comboKey));
  const source = freshOptions.length > 0 ? freshOptions : optionsWithKeys;
  const byCount = new Map();
  source.forEach((option) => {
    const bucket = byCount.get(option.count) || [];
    bucket.push(option);
    byCount.set(option.count, bucket);
  });
  const countWeights = [
    { count: 0, weight: (1 - difficultyBias) * 0.35 + 0.05 },
    { count: 1, weight: (1 - difficultyBias) * 0.5 + 0.25 },
    { count: 2, weight: (1 - difficultyBias) * 0.15 + (difficultyBias * 0.7) },
  ]
    .filter((entry) => byCount.has(entry.count));
  const chosenCount = pickWeighted(countWeights.map((entry) => ({ value: entry.count, weight: entry.weight })));
  const bucket = byCount.get(chosenCount) || source;

  const weightedBucket = bucket.map((option) => {
    const variantDifficulty = option.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant?.level || 0)), 0);
    return {
      value: option,
      weight: 1 + (difficultyBias * variantDifficulty),
    };
  });

  return pickWeighted(weightedBucket);
};

const buildAttemptCandidateFromPiece = (piece, skater, attemptedComboKeys, landedComboKeys, difficultyBias = 0) => {
  const skillLevel = getSkillLevel(skater);
  const allowedTypes = (difficultyKeysBySport[skater.sport] || []).filter((type) => {
    const pieceDifficulty = getPieceDifficulty(piece, skater.sport, type);
    if (pieceDifficulty === null) return false;
    if (!canAttemptBySkill(skillLevel, pieceDifficulty)) return false;
    return getCoreTricksForType(skater, type).length > 0;
  });
  if (allowedTypes.length < 1) return null;

  const chosenType = pickWeighted(buildTypeWeights(allowedTypes, skater).map((item) => ({ value: item.type, weight: item.weight })));
  if (!chosenType) return null;

  const coreOptions = getCoreTricksForType(skater, chosenType);
  if (coreOptions.length < 1) return null;
  const chosenCore = pickWeighted(
    coreOptions.map((core) => ({
      value: core,
      weight: 1 + (difficultyBias * getCoreDifficultyScore(core)),
    }))
  );

  const variantChoice = pickVariantComboForCore(
    getVariantOptionsForCore(chosenCore),
    attemptedComboKeys,
    piece,
    chosenType,
    chosenCore.core,
    difficultyBias
  );
  if (!variantChoice) return null;

  const comboKey = variantChoice.comboKey;
  const landedBefore = landedComboKeys.has(comboKey);
  const switchChance = getSwitchChancePercent(skater?.switchRating);
  const isSwitch = Math.random() * 100 < switchChance;
  const switchDifficultyIncreasePercent = isSwitch ? getSwitchDifficultyIncreasePercent(skater?.switchRating) : 0;
  const baseTrickName = buildTrickName(chosenCore.core, variantChoice.variants);

  return {
    type: chosenType,
    coreName: chosenCore.core,
    coreLevel: Math.max(1, toNumeric(chosenCore.coreLevel) || 1),
    variants: variantChoice.variants.map((variant) => ({
      name: variant.name,
      level: Math.max(1, toNumeric(variant.level) || 1),
      placement: variant.placement,
      parentVariant: variant.parentVariant || variant.name,
    })),
    variantNames: variantChoice.variants.map((variant) => variant.name),
    variantLevel: variantChoice.variants.reduce((sum, variant) => sum + Math.max(1, toNumeric(variant.level) || 1), 0),
    trickName: isSwitch ? `Switch ${baseTrickName}` : baseTrickName,
    pieceName: piece.name,
    pieceCoordinate: piece.coordinate || null,
    pieceDifficulty: Math.max(1, getPieceDifficulty(piece, skater.sport, chosenType) || 1),
    comboKey,
    landedBefore,
    isSwitch,
    switchChance,
    switchDifficultyIncreasePercent,
  };
};

export const buildTrickAttemptsForRun = ({ skater, target, allSkateparkPieces = [], priorSessionResults = [] }) => {
  if (!skater || !target) return [];
  const runPieces = Array.isArray(target.runPieces) ? target.runPieces : [];
  if (runPieces.length < 1) return [];

  const isPieceCandidateForSkater = (piece) => {
    const skillLevel = getSkillLevel(skater);
    const opportunities = Number(piece.trickOpportunities || 0);
    if (opportunities < 1) return false;
    return (difficultyKeysBySport[skater.sport] || []).some((type) => {
      const pd = getPieceDifficulty(piece, skater.sport, type);
      if (pd === null) return false;
      if (!canAttemptBySkill(skillLevel, pd)) return false;
      return getCoreTricksForType(skater, type).length > 0;
    });
  };

  const runCandidatePieces = runPieces.filter(isPieceCandidateForSkater);
  const globalCandidatePieces = (Array.isArray(allSkateparkPieces) ? allSkateparkPieces : []).filter(
    isPieceCandidateForSkater
  );
  const candidatePieces = runCandidatePieces.length > 0 ? runCandidatePieces : globalCandidatePieces;

  if (candidatePieces.length < 1) {
    const skillLevel = getSkillLevel(skater);
    const hasAnyOpportunityPiece = runPieces.some((piece) => Number(piece.trickOpportunities || 0) > 0);
    const hasOnlyTooDifficultPieces = hasAnyOpportunityPiece && runPieces
      .filter((piece) => Number(piece.trickOpportunities || 0) > 0)
      .every((piece) =>
        (difficultyKeysBySport[skater.sport] || []).every((type) => {
          const pd = getPieceDifficulty(piece, skater.sport, type);
          if (pd === null) return true;
          return !canAttemptBySkill(skillLevel, pd);
        })
      );

    if (hasOnlyTooDifficultPieces) {
      return [{
        type: null,
        trickName: "No Attempt - no piece had an appropriate difficulty for this skater.",
        noAttemptReason: "No appropriate difficulty",
        coreName: null,
        coreLevel: 0,
        variants: [],
        variantNames: [],
        variantLevel: 0,
        pieceName: target.label || "Run",
        pieceCoordinate: null,
        pieceDifficulty: 0,
        comboKey: null,
        isSwitch: false,
        switchChance: getSwitchChancePercent(skater?.switchRating),
        switchDifficultyIncreasePercent: 0,
      }];
    }

    return [];
  }

  const chosenRunPiece = pickWeighted(candidatePieces.map((piece) => ({ value: piece, weight: Math.max(1, Number(piece.trickOpportunities || 1)) })));
  if (!chosenRunPiece) return [];

  const attempts = [];
  const attemptCount = Math.max(1, Number(chosenRunPiece.trickOpportunities || 1));
  const usedComboKeysInRun = new Set();
  const attemptedComboKeysInSession = new Set(
    priorSessionResults.filter((entry) => entry?.skaterId === skater.id && entry.comboKey).map((entry) => entry.comboKey)
  );
  const landedComboKeysInSession = new Set(
    priorSessionResults.filter((entry) => entry?.skaterId === skater.id && entry.comboKey && entry.landed).map((entry) => entry.comboKey)
  );
  const fallbackPieces = Array.isArray(allSkateparkPieces)
    ? allSkateparkPieces
      .filter((piece) => !(piece.name === chosenRunPiece.name && (piece.coordinate || null) === (chosenRunPiece.coordinate || null)))
      .filter(isPieceCandidateForSkater)
    : [];
  const sessionProgress = clamp(
    (priorSessionResults.filter((entry) => entry?.skaterId === skater.id).length) / Math.max(1, Number(skater?.energy || 1)),
    0,
    1
  );
  const baseDifficultyBias = Math.pow(sessionProgress, 1.25);

  for (let i = 0; i < attemptCount; i += 1) {
    const perAttemptBias = clamp(baseDifficultyBias + ((i / Math.max(1, attemptCount)) * 0.2), 0, 1);
    const runCandidate = buildAttemptCandidateFromPiece(
      chosenRunPiece,
      skater,
      attemptedComboKeysInSession,
      landedComboKeysInSession,
      perAttemptBias
    );
    let chosen = runCandidate;

    if (runCandidate && runCandidate.landedBefore) {
      const alternatives = fallbackPieces
        .map((piece) => buildAttemptCandidateFromPiece(piece, skater, attemptedComboKeysInSession, landedComboKeysInSession, perAttemptBias))
        .filter((candidate) => candidate && !candidate.landedBefore);
      if (alternatives.length > 0) chosen = randomFrom(alternatives);
    }

    if (!chosen) {
      const globalAlternative = fallbackPieces
        .map((piece) => buildAttemptCandidateFromPiece(piece, skater, attemptedComboKeysInSession, landedComboKeysInSession, perAttemptBias))
        .filter(Boolean);
      if (globalAlternative.length > 0) {
        chosen = randomFrom(globalAlternative);
      }
    }

    if (!chosen) {
      attempts.push({
        type: null,
        trickName: "No Valid Trick Attempt",
        coreName: null,
        coreLevel: 0,
        variants: [],
        variantNames: [],
        variantLevel: 0,
        pieceName: chosenRunPiece.name,
        pieceCoordinate: chosenRunPiece.coordinate || null,
        pieceDifficulty: 0,
        comboKey: null,
        isSwitch: false,
        switchChance: getSwitchChancePercent(skater?.switchRating),
        switchDifficultyIncreasePercent: 0,
      });
      continue;
    }

    if (usedComboKeysInRun.has(chosen.comboKey)) {
      const rerollPool = [chosenRunPiece, ...fallbackPieces]
        .map((piece) => buildAttemptCandidateFromPiece(piece, skater, attemptedComboKeysInSession, landedComboKeysInSession, perAttemptBias))
        .filter((candidate) => candidate && !usedComboKeysInRun.has(candidate.comboKey));
      if (rerollPool.length > 0) chosen = randomFrom(rerollPool);
    }

    if (chosen.comboKey) {
      usedComboKeysInRun.add(chosen.comboKey);
      attemptedComboKeysInSession.add(chosen.comboKey);
    }

    attempts.push(chosen);
  }

  return attempts;
};
