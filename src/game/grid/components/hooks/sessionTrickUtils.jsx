const difficultyKeysBySport = {
  Rollerblader: ["stall", "grind", "tech", "spin", "bigAir"],
  Skateboarder: ["stall", "grind", "flip", "grab", "bigAir"],
};

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

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
  const value = toNumeric(difficulty[type]);
  return value === null ? null : Math.max(0, value);
};

const getSkaterRatingForType = (skater, type) => {
  const raw = Number(skater?.[type] || 0);
  if (!Number.isFinite(raw)) return 0;
  const safe = Math.max(0, raw);
  if (safe <= 10) return Math.min(100, safe * 10);
  return safe;
};

const buildTypeWeights = (types, skater) => {
  if (types.length === 1) return [{ type: types[0], weight: 1 }];

  const raw = types.map((type) => ({ type, value: getSkaterRatingForType(skater, type) }));
  const total = raw.reduce((sum, item) => sum + item.value, 0);

  const normalized = total > 0
    ? raw.map((item) => ({ type: item.type, weight: item.value / total }))
    : raw.map((item) => ({ type: item.type, weight: 1 / raw.length }));

  const best = [...normalized].sort((a, b) => b.weight - a.weight)[0];
  if (!best || best.weight <= 0.5) return normalized;

  const bestType = best.type;
  const rest = normalized.filter((item) => item.type !== bestType);
  const restTotal = rest.reduce((sum, item) => sum + item.weight, 0);

  if (rest.length < 1) return [{ type: bestType, weight: 1 }];

  return [
    { type: bestType, weight: 0.5 },
    ...rest.map((item) => ({
      type: item.type,
      weight: restTotal > 0 ? (item.weight / restTotal) * 0.5 : 0.5 / rest.length,
    })),
  ];
};

const getCoreTricksForType = (skater, type) =>
  (Array.isArray(skater?.trickLibrary) ? skater.trickLibrary : []).filter(
    (trick) => trick.type === type && trick.nodeType === "core"
  );

const getVariantModifiersForCore = (skater, type, coreName) =>
  (Array.isArray(skater?.trickLibrary) ? skater.trickLibrary : []).filter(
    (trick) =>
      trick.type === type &&
      trick.core === coreName &&
      (trick.nodeType === "variant" || trick.nodeType === "upgrade")
  );

const makeTrickComboKey = (pieceName, pieceCoordinate, type, coreName, variantNames) =>
  `${pieceName}|${pieceCoordinate || "none"}|${type}|${coreName}|${variantNames.sort().join("+")}`;

const getVariantOptionsForCore = (modifiers) => {
  const none = [{ variants: [], count: 0 }];
  if (modifiers.length < 1) return none;

  const singles = modifiers.map((modifier) => ({
    variants: [modifier],
    count: 1,
  }));

  const doubles = [];
  for (let i = 0; i < modifiers.length; i++) {
    for (let j = i + 1; j < modifiers.length; j++) {
      if (modifiers[i].branchKey === modifiers[j].branchKey) continue;
      doubles.push({
        variants: [modifiers[i], modifiers[j]],
        count: 2,
      });
    }
  }

  return [...none, ...singles, ...doubles];
};

const pickVariantComboForCore = (options, attemptedComboKeys, piece, type, coreName) => {
  const optionsWithKeys = options.map((option) => {
    const names = option.variants.map((variant) => variant.name).sort();
    const comboKey = makeTrickComboKey(piece.name, piece.coordinate, type, coreName, names);
    return { ...option, comboKey, variantNames: names };
  });

  const freshOptions = optionsWithKeys.filter((option) => !attemptedComboKeys.has(option.comboKey));
  const source = freshOptions.length > 0 ? freshOptions : optionsWithKeys;

  const byCount = new Map();
  source.forEach((option) => {
    const list = byCount.get(option.count) || [];
    list.push(option);
    byCount.set(option.count, list);
  });

  const countWeights = [
    { count: 0, weight: 0.25 },
    { count: 1, weight: 0.5 },
    { count: 2, weight: 0.25 },
  ].filter((entry) => byCount.has(entry.count));

  const chosenCount = pickWeighted(countWeights.map((entry) => ({ value: entry.count, weight: entry.weight })));
  const bucket = byCount.get(chosenCount) || source;
  return randomFrom(bucket);
};

const buildAttemptCandidateFromPiece = (piece, skater, attemptedComboKeys, landedComboKeys) => {
  const allowedTypes = (difficultyKeysBySport[skater.sport] || []).filter((type) => {
    const pieceDifficulty = getPieceDifficulty(piece, skater.sport, type);
    if (pieceDifficulty === null) return false;
    const ttr = getSkaterRatingForType(skater, type);
    if (ttr < pieceDifficulty * 10) return false;
    return getCoreTricksForType(skater, type).length > 0;
  });

  if (allowedTypes.length < 1) return null;

  const weightedTypes = buildTypeWeights(allowedTypes, skater);
  const chosenType = pickWeighted(weightedTypes.map((item) => ({ value: item.type, weight: item.weight })));
  if (!chosenType) return null;

  const coreOptions = getCoreTricksForType(skater, chosenType);
  if (coreOptions.length < 1) return null;
  const chosenCore = randomFrom(coreOptions);

  const variants = getVariantModifiersForCore(skater, chosenType, chosenCore.core || chosenCore.name);
  const variantChoice = pickVariantComboForCore(
    getVariantOptionsForCore(variants),
    attemptedComboKeys,
    piece,
    chosenType,
    chosenCore.core || chosenCore.name
  );
  if (!variantChoice) return null;

  const variantNames = [...variantChoice.variantNames];
  const comboKey = variantChoice.comboKey;
  const landedBefore = landedComboKeys.has(comboKey);

  return {
    type: chosenType,
    coreName: chosenCore.core || chosenCore.name,
    coreLevel: Math.max(1, toNumeric(chosenCore.level) || 1),
    variants: variantChoice.variants.map((variant) => ({
      name: variant.name,
      level: Math.max(1, toNumeric(variant.level) || 1),
      branchKey: variant.branchKey || null,
    })),
    variantNames,
    variantLevel: variantChoice.variants.reduce((sum, variant) => sum + Math.max(1, toNumeric(variant.level) || 1), 0),
    trickName:
      variantNames.length > 0
        ? `${chosenCore.core || chosenCore.name} | ${variantNames.join(" + ")}`
        : chosenCore.core || chosenCore.name,
    pieceName: piece.name,
    pieceCoordinate: piece.coordinate || null,
    pieceDifficulty: Math.max(1, getPieceDifficulty(piece, skater.sport, chosenType) || 1),
    comboKey,
    landedBefore,
  };
};

export const buildTrickAttemptsForRun = ({ skater, target, allSkateparkPieces = [], priorSessionResults = [] }) => {
  if (!skater || !target) return [];

  const runPieces = Array.isArray(target.runPieces) ? target.runPieces : [];
  if (runPieces.length < 1) return [];

  const candidatePieces = runPieces.filter((piece) => {
    const opportunities = Number(piece.trickOpportunities || 0);
    if (opportunities < 1) return false;
    return (difficultyKeysBySport[skater.sport] || []).some((type) => {
      const pd = getPieceDifficulty(piece, skater.sport, type);
      if (pd === null) return false;
      return getCoreTricksForType(skater, type).length > 0;
    });
  });

  if (candidatePieces.length < 1) return [];

  const chosenRunPiece = pickWeighted(
    candidatePieces.map((piece) => ({
      value: piece,
      weight: Math.max(1, Number(piece.trickOpportunities || 1)),
    }))
  );
  if (!chosenRunPiece) return [];

  const attempts = [];
  const attemptCount = Math.max(1, Number(chosenRunPiece.trickOpportunities || 1));
  const usedComboKeysInRun = new Set();
  const attemptedComboKeysInSession = new Set(
    priorSessionResults
      .filter((entry) => entry?.skaterId === skater.id && entry.comboKey)
      .map((entry) => entry.comboKey)
  );
  const landedComboKeysInSession = new Set(
    priorSessionResults
      .filter((entry) => entry?.skaterId === skater.id && entry.comboKey && entry.landed)
      .map((entry) => entry.comboKey)
  );

  const fallbackPieces = Array.isArray(allSkateparkPieces)
    ? allSkateparkPieces.filter(
        (piece) =>
          !(piece.name === chosenRunPiece.name && (piece.coordinate || null) === (chosenRunPiece.coordinate || null))
      )
    : [];

  for (let i = 0; i < attemptCount; i++) {
    const runCandidate = buildAttemptCandidateFromPiece(
      chosenRunPiece,
      skater,
      attemptedComboKeysInSession,
      landedComboKeysInSession
    );

    let chosen = runCandidate;
    if (runCandidate && runCandidate.landedBefore) {
      const alternatives = fallbackPieces
        .map((piece) =>
          buildAttemptCandidateFromPiece(piece, skater, attemptedComboKeysInSession, landedComboKeysInSession)
        )
        .filter((candidate) => candidate && !candidate.landedBefore);

      if (alternatives.length > 0) {
        chosen = randomFrom(alternatives);
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
      });
      continue;
    }

    if (usedComboKeysInRun.has(chosen.comboKey)) {
      const rerollPool = [chosenRunPiece, ...fallbackPieces]
        .map((piece) =>
          buildAttemptCandidateFromPiece(piece, skater, attemptedComboKeysInSession, landedComboKeysInSession)
        )
        .filter((candidate) => candidate && !usedComboKeysInRun.has(candidate.comboKey));
      if (rerollPool.length > 0) {
        chosen = randomFrom(rerollPool);
      }
    }

    if (chosen.comboKey) {
      usedComboKeysInRun.add(chosen.comboKey);
      attemptedComboKeysInSession.add(chosen.comboKey);
    }

    attempts.push(chosen);
  }

  return attempts;
};
