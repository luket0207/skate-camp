import { TRICK_TREES, TRICK_TYPES_BY_SPORT } from "../../assets/gameContent/tricks/trickTrees";

const coreId = (type, core) => `core|${type}|${core}`;
const variantId = (type, core, variant) => `variant|${type}|${core}|${variant}`;
const upgradeId = (type, core, variant, index, name) => `upgrade|${type}|${core}|${variant}|${index}|${name}`;
const branchKey = (type, core, variant) => `${type}|${core}|${variant}`;

const toTitle = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const shuffleItems = (items) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const serializeTypeState = (trickLibrary, type) =>
  trickLibrary
    .filter((entry) => entry.type === type)
    .map((entry) => entry.id)
    .sort()
    .join("|");

const getBranchState = (trickLibrary, key) =>
  trickLibrary.find((entry) => entry.branchKey === key && (entry.nodeType === "variant" || entry.nodeType === "upgrade"));

const hasCore = (trickLibrary, type, core) => trickLibrary.some((entry) => entry.id === coreId(type, core));

export const getTrickTreeForSport = (sport) => TRICK_TREES[sport] || {};

export const getTypeRatingsForSkater = (skater) => {
  const typeKeys = TRICK_TYPES_BY_SPORT[skater.sport] || [];
  return typeKeys.reduce((acc, typeKey) => {
    acc[typeKey] = Math.max(0, Number(skater[typeKey] || 0));
    return acc;
  }, {});
};

export const getLibraryLevelTotal = (trickLibrary) =>
  trickLibrary.reduce((sum, trick) => sum + (Number(trick.level) || 0), 0);

const addCore = (trickLibrary, type, core, level) => [
  ...trickLibrary,
  {
    id: coreId(type, core),
    nodeType: "core",
    type,
    typeLabel: toTitle(type),
    core,
    name: core,
    level,
  },
];

const addVariant = (trickLibrary, type, core, variant, level) => [
  ...trickLibrary.filter((entry) => entry.branchKey !== branchKey(type, core, variant)),
  {
    id: variantId(type, core, variant),
    nodeType: "variant",
    type,
    typeLabel: toTitle(type),
    core,
    variant,
    name: variant,
    level,
    branchKey: branchKey(type, core, variant),
    branchLevel: level,
  },
];

const addUpgrade = (trickLibrary, type, core, variant, level, index, name) => [
  ...trickLibrary.filter((entry) => entry.branchKey !== branchKey(type, core, variant)),
  {
    id: upgradeId(type, core, variant, index, name),
    nodeType: "upgrade",
    type,
    typeLabel: toTitle(type),
    core,
    variant,
    name,
    level,
    branchKey: branchKey(type, core, variant),
    branchLevel: level,
    upgradeIndex: index,
  },
];

export const getNodeAvailability = (trickLibrary, type, coreNode, variantNode = null, upgradeNode = null, upgradeIndex = -1) => {
  if (!variantNode) {
    const purchased = hasCore(trickLibrary, type, coreNode.core);
    return { available: !purchased, reason: purchased ? "Purchased" : "Available", cost: coreNode.level };
  }

  const corePurchased = hasCore(trickLibrary, type, coreNode.core);
  if (!corePurchased) return { available: false, reason: "Core Required", cost: variantNode.level };

  const currentBranch = getBranchState(trickLibrary, branchKey(type, coreNode.core, variantNode.name));

  if (!upgradeNode) {
    if (currentBranch) return { available: false, reason: "Branch Owned", cost: variantNode.level };
    return { available: true, reason: "Available", cost: variantNode.level };
  }

  if (!currentBranch) return { available: false, reason: "Variant Required", cost: upgradeNode.level };

  if (currentBranch.nodeType === "variant" && upgradeIndex !== 0) {
    return { available: false, reason: "Previous Upgrade Required", cost: Math.max(1, upgradeNode.level - currentBranch.branchLevel) };
  }

  if (currentBranch.nodeType === "upgrade" && currentBranch.upgradeIndex !== upgradeIndex - 1) {
    return { available: false, reason: "Previous Upgrade Required", cost: Math.max(1, upgradeNode.level - currentBranch.branchLevel) };
  }

  if (currentBranch.nodeType === "upgrade" && currentBranch.upgradeIndex >= upgradeIndex) {
    return { available: false, reason: "Purchased", cost: 0 };
  }

  return { available: true, reason: "Available", cost: Math.max(1, upgradeNode.level - currentBranch.branchLevel) };
};

export const purchaseNode = ({ trickLibrary, type, coreNode, variantNode = null, upgradeNode = null, upgradeIndex = -1 }) => {
  const availability = getNodeAvailability(trickLibrary, type, coreNode, variantNode, upgradeNode, upgradeIndex);
  if (!availability.available) return { trickLibrary, spent: 0, success: false };

  if (!variantNode) {
    return { trickLibrary: addCore(trickLibrary, type, coreNode.core, coreNode.level), spent: coreNode.level, success: true };
  }

  if (!upgradeNode) {
    return {
      trickLibrary: addVariant(trickLibrary, type, coreNode.core, variantNode.name, variantNode.level),
      spent: variantNode.level,
      success: true,
    };
  }

  return {
    trickLibrary: addUpgrade(trickLibrary, type, coreNode.core, variantNode.name, upgradeNode.level, upgradeIndex, upgradeNode.name),
    spent: availability.cost,
    success: true,
  };
};

const getGenerationActionsForType = (sport, type, trickLibrary, remainingPoints) => {
  const cores = (TRICK_TREES[sport]?.[type] || []).flatMap((coreNode) => {
    const actions = [];

    const coreAvailability = getNodeAvailability(trickLibrary, type, coreNode);
    if (coreAvailability.available && coreNode.level === 1 && coreAvailability.cost <= remainingPoints) {
      actions.push({ type, coreNode, cost: coreAvailability.cost });
    }

    coreNode.variants.forEach((variantNode) => {
      const variantAvailability = getNodeAvailability(trickLibrary, type, coreNode, variantNode);
      if (variantAvailability.available && variantAvailability.cost <= remainingPoints) {
        actions.push({ type, coreNode, variantNode, cost: variantAvailability.cost });
      }

      variantNode.upgrades.forEach((upgradeNode, upgradeIndex) => {
        const upgradeAvailability = getNodeAvailability(trickLibrary, type, coreNode, variantNode, upgradeNode, upgradeIndex);
        if (upgradeAvailability.available && upgradeAvailability.cost <= remainingPoints) {
          actions.push({ type, coreNode, variantNode, upgradeNode, upgradeIndex, cost: upgradeAvailability.cost });
        }
      });
    });

    return actions;
  });

  return cores;
};

const getMaxSpendForBudget = (sport, type, trickLibrary, budget, memo) => {
  if (budget <= 0) return 0;

  const key = `${type}::${budget}::${serializeTypeState(trickLibrary, type)}`;
  if (memo.has(key)) return memo.get(key);

  const actions = getGenerationActionsForType(sport, type, trickLibrary, budget);
  if (actions.length < 1) {
    memo.set(key, 0);
    return 0;
  }

  let best = 0;
  actions.forEach((action) => {
    const result = purchaseNode({
      trickLibrary,
      type,
      coreNode: action.coreNode,
      variantNode: action.variantNode,
      upgradeNode: action.upgradeNode,
      upgradeIndex: action.upgradeIndex,
    });

    if (!result.success || result.spent < 1) return;
    const next = result.spent + getMaxSpendForBudget(sport, type, result.trickLibrary, budget - result.spent, memo);
    if (next > best) best = next;
  });

  memo.set(key, best);
  return best;
};

export const buildGeneratedTrickLibrary = (skater) => {
  const ratings = getTypeRatingsForSkater(skater);
  let trickLibrary = [];

  Object.entries(ratings).forEach(([type, budgetRaw]) => {
    let budget = Number(budgetRaw || 0);
    const memo = new Map();

    while (budget > 0) {
      const actions = getGenerationActionsForType(skater.sport, type, trickLibrary, budget);
      if (actions.length < 1) break;

      let chosenResult = null;
      let chosenAction = null;
      let bestTotalSpend = -1;

      shuffleItems(actions).forEach((action) => {
        const result = purchaseNode({
          trickLibrary,
          type,
          coreNode: action.coreNode,
          variantNode: action.variantNode,
          upgradeNode: action.upgradeNode,
          upgradeIndex: action.upgradeIndex,
        });

        if (!result.success || result.spent < 1) return;

        const futureSpend = getMaxSpendForBudget(
          skater.sport,
          type,
          result.trickLibrary,
          budget - result.spent,
          memo
        );
        const totalSpend = result.spent + futureSpend;

        if (totalSpend > bestTotalSpend) {
          bestTotalSpend = totalSpend;
          chosenResult = result;
          chosenAction = action;
        }
      });

      if (!chosenAction || !chosenResult) break;

      trickLibrary = chosenResult.trickLibrary;
      budget -= chosenResult.spent;
    }
  });

  return trickLibrary;
};
