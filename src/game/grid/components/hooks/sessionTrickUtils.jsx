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

const getAvailableTrickTypesOnPiece = (piece, sport) => {
  const difficulty = piece?.difficulty?.[sport === "Rollerblader" ? "rollerblader" : "skateboarder"];
  if (!difficulty) return [];

  const keys = difficultyKeysBySport[sport] || [];
  return keys.filter((type) => {
    const value = difficulty[type];
    return value != null;
  });
};

const getSkaterRatingForType = (skater, type) => {
  const raw = Number(skater?.[type] || 0);
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
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

const chooseTrickType = (availableTypes, skater) => {
  const weighted = buildTypeWeights(availableTypes, skater);
  return pickWeighted(weighted.map((item) => ({ value: item.type, weight: item.weight })));
};

const getTricksForType = (skater, type) =>
  (Array.isArray(skater?.trickLibrary) ? skater.trickLibrary : []).filter((trick) => trick.type === type);

const makePairKey = (pieceName, pieceCoordinate, trickName) => `${pieceName}|${pieceCoordinate || "none"}|${trickName}`;

const getPieceTrickPairs = (piece, skater) => {
  const availableTypes = getAvailableTrickTypesOnPiece(piece, skater.sport).filter(
    (type) => getTricksForType(skater, type).length > 0
  );
  if (availableTypes.length < 1) return [];

  const weightedTypes = buildTypeWeights(availableTypes, skater);
  return weightedTypes.flatMap((item) =>
    getTricksForType(skater, item.type).map((trick) => ({
      piece,
      type: item.type,
      trick,
      weight: item.weight,
      pairKey: makePairKey(piece.name, piece.coordinate, trick.name),
    }))
  );
};

export const buildTrickAttemptsForRun = ({ skater, target, allSkateparkPieces = [], priorSessionAttempts = [] }) => {
  if (!skater || !target) return [];

  const runPieces = Array.isArray(target.runPieces) ? target.runPieces : [];
  if (runPieces.length < 1) return [];

  const candidatePieces = runPieces.filter((piece) => {
    const opportunities = Number(piece.trickOpportunities || 0);
    if (opportunities < 1) return false;
    const availableTypes = getAvailableTrickTypesOnPiece(piece, skater.sport);
    return availableTypes.some((type) => getTricksForType(skater, type).length > 0);
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
  const usedPairsInRun = new Set();
  const usedPairsInSession = new Set(
    priorSessionAttempts
      .filter((entry) => entry?.skaterId === skater.id)
      .map((entry) => makePairKey(entry.pieceName, entry.pieceCoordinate, entry.trickName))
  );

  const fallbackPieces = Array.isArray(allSkateparkPieces)
    ? allSkateparkPieces.filter(
        (piece) =>
          !(piece.name === chosenRunPiece.name && (piece.coordinate || null) === (chosenRunPiece.coordinate || null))
      )
    : [];

  for (let i = 0; i < attemptCount; i++) {
    const runPiecePairs = getPieceTrickPairs(chosenRunPiece, skater);
    const freshRunPairs = runPiecePairs.filter(
      (pair) => !usedPairsInRun.has(pair.pairKey) && !usedPairsInSession.has(pair.pairKey)
    );

    let chosenPair = null;

    if (freshRunPairs.length > 0) {
      chosenPair = pickWeighted(
        freshRunPairs.map((pair) => ({
          value: pair,
          weight: Math.max(0.01, pair.weight),
        }))
      );
    } else {
      const fallbackCandidates = fallbackPieces.flatMap((piece) =>
        getPieceTrickPairs(piece, skater).filter(
          (pair) => !usedPairsInRun.has(pair.pairKey) && !usedPairsInSession.has(pair.pairKey)
        )
      );

      if (fallbackCandidates.length > 0) {
        chosenPair = pickWeighted(
          fallbackCandidates.map((pair) => ({
            value: pair,
            weight: Math.max(0.01, pair.weight) * Math.max(1, Number(pair.piece.trickOpportunities || 1)),
          }))
        );
      } else {
        const nonRepeatInRunPairs = runPiecePairs.filter((pair) => !usedPairsInRun.has(pair.pairKey));
        const repeatPool = nonRepeatInRunPairs.length > 0 ? nonRepeatInRunPairs : runPiecePairs;
        chosenPair = pickWeighted(
          repeatPool.map((pair) => ({
            value: pair,
            weight: Math.max(0.01, pair.weight),
          }))
        );
      }
    }

    if (!chosenPair) continue;

    usedPairsInRun.add(chosenPair.pairKey);

    attempts.push({
      type: chosenPair.type,
      trickName: chosenPair.trick.name,
      coreName: chosenPair.trick.core || chosenPair.trick.name,
      variantName: chosenPair.trick.variant || null,
      pieceName: chosenPair.piece.name,
      pieceCoordinate: chosenPair.piece.coordinate || null,
    });
  }

  return attempts;
};
