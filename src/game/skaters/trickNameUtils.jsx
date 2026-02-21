const placementOrder = (placement) => {
  const raw = String(placement || "").toUpperCase();
  if (raw.startsWith("B")) {
    const order = Number(raw.slice(1));
    return Number.isFinite(order) && order > 0 ? order : 999;
  }
  return 999;
};

export const buildTrickName = (coreName, modifiers = []) => {
  const list = Array.isArray(modifiers) ? modifiers : [];
  const replaceMods = list.filter((item) => String(item.placement || "").toUpperCase().startsWith("R"));
  const beforeMods = list
    .filter((item) => String(item.placement || "").toUpperCase().startsWith("B"))
    .sort((a, b) => placementOrder(a.placement) - placementOrder(b.placement) || String(a.name).localeCompare(String(b.name)));
  const afterMods = list.filter((item) => String(item.placement || "").toUpperCase() === "A");

  const resolvedCore = replaceMods.length > 0
    ? [...replaceMods].sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0))[0].name
    : coreName;

  return [...beforeMods.map((item) => item.name), resolvedCore, ...afterMods.map((item) => item.name)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
};

export const makeModifierKey = (modifier) =>
  `${modifier.parentVariant || modifier.name}|${modifier.name}`;
