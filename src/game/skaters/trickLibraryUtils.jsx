import { TRICK_TREES, TRICK_TYPES_BY_SPORT } from "../../assets/gameContent/tricks/trickTrees";
import { makeModifierKey } from "./trickNameUtils";

const toTitle = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const randomIntInclusive = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getCoreKey = (type, core) => `${type}|${core}`;
const getModifierNodeKey = (node) => `${node.parentVariant || node.name}|${node.name}`;

const getCoreEntry = (library, type, coreName) =>
  (Array.isArray(library) ? library : []).find((entry) => entry.type === type && entry.core === coreName);

const hasCore = (library, type, coreName) => Boolean(getCoreEntry(library, type, coreName));

const hasModifier = (coreEntry, node) => {
  const key = getModifierNodeKey(node);
  return (coreEntry?.modifiers || []).some((modifier) => makeModifierKey(modifier) === key);
};

const hasModifierByName = (coreEntry, modifierName) =>
  (coreEntry?.modifiers || []).some((modifier) => modifier.name === modifierName);

const hasRequiredCoreLock = (library, lockRule) => {
  if (!lockRule?.type || !lockRule?.core) return true;
  return hasCore(library, lockRule.type, lockRule.core);
};

const getAllCoresForType = (sport, type) => TRICK_TREES[sport]?.[type] || [];
const getAllCoresForSport = (sport) =>
  Object.entries(TRICK_TREES[sport] || {}).flatMap(([type, cores]) =>
    cores.map((coreNode) => ({ ...coreNode, type }))
  );

const getCoreCost = (coreNode) => Number(coreNode?.cost || 0);
const getModifierCost = (node) => Number(node?.cost || node?.level || 0);

const cloneLibrary = (library) => (Array.isArray(library) ? [...library].map((entry) => ({
  ...entry,
  modifiers: [...(entry.modifiers || [])],
})) : []);

export const getTrickTreeForSport = (sport) => TRICK_TREES[sport] || {};

export const getMaxTypeCostBySport = (sport) => {
  const types = TRICK_TYPES_BY_SPORT[sport] || [];
  return types.reduce((acc, type) => {
    const cores = getAllCoresForType(sport, type);
    acc[type] = cores.reduce(
      (sum, coreNode) =>
        sum +
        getCoreCost(coreNode) +
        (coreNode.modifiers || []).reduce((modifierSum, modifier) => modifierSum + getModifierCost(modifier), 0),
      0
    );
    return acc;
  }, {});
};

export const getTypeRatingsForSkater = (skater) => {
  const typeKeys = TRICK_TYPES_BY_SPORT[skater?.sport] || [];
  const library = Array.isArray(skater?.trickLibrary) ? skater.trickLibrary : [];
  return typeKeys.reduce((acc, type) => {
    const total = library
      .filter((coreEntry) => coreEntry.type === type)
      .reduce(
        (sum, coreEntry) =>
          sum +
          Number(coreEntry.coreCost || 0) +
          (coreEntry.modifiers || []).reduce((modifierSum, modifier) => modifierSum + Number(modifier.cost || modifier.level || 0), 0),
        0
      );
    acc[type] = total;
    return acc;
  }, {});
};

export const getLibraryLevelTotal = (trickLibrary) => {
  const library = Array.isArray(trickLibrary) ? trickLibrary : [];
  return library.reduce(
    (sum, coreEntry) =>
      sum +
      Number(coreEntry.coreCost || 0) +
      (coreEntry.modifiers || []).reduce((modifierSum, modifier) => modifierSum + Number(modifier.cost || modifier.level || 0), 0),
    0
  );
};

export const recalculateSkaterTypeRatings = (skater) => {
  const ratings = getTypeRatingsForSkater(skater);
  const maxByType = getMaxTypeCostBySport(skater?.sport);
  const total = Object.values(ratings).reduce((sum, value) => sum + value, 0);
  const totalMax = Object.values(maxByType).reduce((sum, value) => sum + Number(value || 0), 0);
  const weightedPercent = totalMax > 0 ? Math.round((total / totalMax) * 100) : 1;
  return {
    ...ratings,
    skillLevel: Math.max(1, Math.min(100, weightedPercent)),
  };
};

const canUnlockCore = (library, type, coreNode, sport) => {
  if (hasCore(library, type, coreNode.core)) return { available: false, reason: "Purchased", cost: getCoreCost(coreNode) };
  if ((Number(coreNode.level) || 1) <= 1) return { available: true, reason: "Available", cost: getCoreCost(coreNode) };

  const previousLevel = (Number(coreNode.level) || 1) - 1;
  const previousCores = getAllCoresForType(sport, type).filter((entry) => Number(entry.level || 1) === previousLevel);
  const hasAllPrevious = previousCores.every((entry) => hasCore(library, type, entry.core));
  if (!hasAllPrevious) {
    return { available: false, reason: `Unlock all L${previousLevel} cores first`, cost: getCoreCost(coreNode) };
  }
  return { available: true, reason: "Available", cost: getCoreCost(coreNode) };
};

const canUnlockModifier = (library, type, coreNode, modifierNode) => {
  const coreEntry = getCoreEntry(library, type, coreNode.core);
  if (!coreEntry) return { available: false, reason: "Core required", cost: getModifierCost(modifierNode) };
  if (hasModifier(coreEntry, modifierNode)) return { available: false, reason: "Purchased", cost: getModifierCost(modifierNode) };

  if (modifierNode.kind === "upgrade" && !hasModifierByName(coreEntry, modifierNode.parentVariant)) {
    return { available: false, reason: "Base variant required", cost: getModifierCost(modifierNode) };
  }

  if (!hasRequiredCoreLock(library, modifierNode.lockedBy)) {
    return { available: false, reason: `Locked by ${modifierNode.lockedBy.core}`, cost: getModifierCost(modifierNode) };
  }

  return { available: true, reason: "Available", cost: getModifierCost(modifierNode) };
};

export const getNodeAvailability = (
  trickLibrary,
  type,
  coreNode,
  modifierNode = null,
  sport = null
) => {
  const library = cloneLibrary(trickLibrary);
  if (!modifierNode) {
    return canUnlockCore(library, type, coreNode, sport);
  }
  return canUnlockModifier(library, type, coreNode, modifierNode);
};

const addCore = (library, type, coreNode) => [
  ...library,
  {
    type,
    typeLabel: toTitle(type),
    core: coreNode.core,
    coreLevel: Number(coreNode.level) || 1,
    coreCost: getCoreCost(coreNode),
    modifiers: [],
  },
];

const addModifier = (library, type, coreNode, modifierNode) => {
  const next = cloneLibrary(library);
  const entry = getCoreEntry(next, type, coreNode.core);
  if (!entry) return next;
  entry.modifiers.push({
    kind: modifierNode.kind,
    name: modifierNode.name,
    level: Number(modifierNode.level) || 1,
    cost: getModifierCost(modifierNode),
    placement: modifierNode.placement,
    parentVariant: modifierNode.parentVariant || modifierNode.name,
    lockedBy: modifierNode.lockedBy || null,
  });
  return next;
};

export const purchaseNode = ({
  trickLibrary,
  type,
  coreNode,
  modifierNode = null,
  sport = null,
}) => {
  const library = cloneLibrary(trickLibrary);
  const availability = getNodeAvailability(library, type, coreNode, modifierNode, sport);
  if (!availability.available) return { trickLibrary: library, spent: 0, success: false };

  if (!modifierNode) {
    return {
      trickLibrary: addCore(library, type, coreNode),
      spent: getCoreCost(coreNode),
      success: true,
    };
  }

  return {
    trickLibrary: addModifier(library, type, coreNode, modifierNode),
    spent: getModifierCost(modifierNode),
    success: true,
  };
};

const getModifierCount = (library) =>
  (Array.isArray(library) ? library : []).reduce(
    (sum, coreEntry) => sum + ((coreEntry?.modifiers || []).length || 0),
    0
  );

const getAvailableModifierActions = (library, sport, maxLevel = Infinity) => {
  const actions = [];
  const coreRefs = listUnlockedCoreRefs(library);

  coreRefs.forEach(({ type, core }) => {
    const coreNode = getCoreNodeByRef(sport, type, core);
    if (!coreNode) return;
    (coreNode.modifiers || []).forEach((modifierNode) => {
      if (Number(modifierNode.level || 0) > maxLevel) return;
      const availability = getNodeAvailability(library, type, coreNode, modifierNode, sport);
      if (!availability.available) return;
      actions.push({ type, coreNode, modifierNode });
    });
  });

  return actions;
};

const unlockRandomModifiersGlobal = ({
  library,
  sport,
  minTotal = 0,
  maxTotal = 0,
  maxModifierLevel = Infinity,
}) => {
  let nextLibrary = cloneLibrary(library);
  const startCount = getModifierCount(nextLibrary);
  const targetAdditional = Math.max(0, randomIntInclusive(minTotal, maxTotal));
  const targetTotal = startCount + targetAdditional;
  let guard = 0;

  while (getModifierCount(nextLibrary) < targetTotal && guard < 500) {
    guard += 1;
    const available = getAvailableModifierActions(nextLibrary, sport, maxModifierLevel);
    if (available.length < 1) break;
    const chosen = available[randomIntInclusive(0, available.length - 1)];
    const result = purchaseNode({
      trickLibrary: nextLibrary,
      type: chosen.type,
      coreNode: chosen.coreNode,
      modifierNode: chosen.modifierNode,
      sport,
    });
    if (!result.success) break;
    nextLibrary = result.trickLibrary;
  }

  return nextLibrary;
};

const unlockCoreIfPossible = (library, sport, type, coreNode) => {
  const result = purchaseNode({ trickLibrary: library, type, coreNode, sport });
  return result.success ? result.trickLibrary : library;
};

const unlockAllCoresAtLevel = (library, sport, level) => {
  let nextLibrary = cloneLibrary(library);
  const cores = getAllCoresForSport(sport).filter((coreNode) => Number(coreNode.level) === level);
  cores.forEach((coreNode) => {
    nextLibrary = unlockCoreIfPossible(nextLibrary, sport, coreNode.type, coreNode);
  });
  return nextLibrary;
};

const unlockRandomCoresAtLevel = (library, sport, level, count) => {
  let nextLibrary = cloneLibrary(library);
  const available = getAllCoresForSport(sport)
    .filter((coreNode) => Number(coreNode.level) === level)
    .filter((coreNode) => getNodeAvailability(nextLibrary, coreNode.type, coreNode, null, sport).available);
  const pool = [...available];

  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const pickIndex = randomIntInclusive(0, pool.length - 1);
    const [chosen] = pool.splice(pickIndex, 1);
    nextLibrary = unlockCoreIfPossible(nextLibrary, sport, chosen.type, chosen);
  }

  return nextLibrary;
};

const listUnlockedCoreRefs = (library) =>
  (Array.isArray(library) ? library : []).map((entry) => ({ type: entry.type, core: entry.core }));

const getCoreNodeByRef = (sport, type, coreName) =>
  getAllCoresForType(sport, type).find((node) => node.core === coreName);

const buildBeginnerLibrary = (sport) => {
  let library = [];
  const corePool = getAllCoresForSport(sport).filter((coreNode) => Number(coreNode.level) === 1 && coreNode.type !== "bigAir");
  const coreCount = Math.min(corePool.length, randomIntInclusive(3, 5));

  for (let i = 0; i < coreCount; i += 1) {
    const pickIndex = randomIntInclusive(0, corePool.length - 1);
    const [chosen] = corePool.splice(pickIndex, 1);
    library = unlockCoreIfPossible(library, sport, chosen.type, chosen);
  }

  library = unlockRandomModifiersGlobal({
    library,
    sport,
    minTotal: 0,
    maxTotal: 5,
    maxModifierLevel: 2,
  });

  return library;
};

const buildMediumLibrary = (sport) => {
  let library = unlockAllCoresAtLevel([], sport, 1);
  library = unlockAllCoresAtLevel(library, sport, 2);
  library = unlockRandomModifiersGlobal({
    library,
    sport,
    minTotal: 0,
    maxTotal: 15,
    maxModifierLevel: 4,
  });

  return library;
};

const buildProLibrary = (sport) => {
  let library = unlockAllCoresAtLevel([], sport, 1);
  library = unlockAllCoresAtLevel(library, sport, 2);
  const level3CorePool = getAllCoresForSport(sport).filter((coreNode) => Number(coreNode.level) === 3);
  const extraLevel3 = randomIntInclusive(0, level3CorePool.length);
  library = unlockRandomCoresAtLevel(library, sport, 3, extraLevel3);
  const availableForAnyLevel = getAvailableModifierActions(library, sport, Infinity).length;
  const minProVariants = Math.min(15, availableForAnyLevel);
  const maxProVariants = availableForAnyLevel;
  library = unlockRandomModifiersGlobal({
    library,
    sport,
    minTotal: minProVariants,
    maxTotal: maxProVariants,
    maxModifierLevel: Infinity,
  });

  return library;
};

export const buildGeneratedTrickLibrary = ({ sport, tier }) => {
  if (tier === "Beginner") return buildBeginnerLibrary(sport);
  if (tier === "Pro") return buildProLibrary(sport);
  return buildMediumLibrary(sport);
};
