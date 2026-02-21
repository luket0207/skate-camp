const pieceImageModules = import.meta.glob("../../../../assets/images/pieces/*.png", {
  eager: true,
  import: "default",
});

const imageByFileName = Object.fromEntries(
  Object.entries(pieceImageModules).map(([path, url]) => [path.split("/").pop(), url])
);

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const PIECE_IMAGE_FILE_BY_ID = {
  "route-big-flatbank": "large-flatbank.png",
  "route-big-quarter-pipe": "large-quarter-pipe.png",
  "route-big-quarter-pipe-box": "large-quarter-pipe-with-box.png",
  "route-small-grind-box-square": "small-square-rail.png",
  "route-small-grind-box-round": "small-round-rail.png",
};

export const getPieceImageUrl = (piece) => {
  if (!piece) return null;

  const explicitFile = PIECE_IMAGE_FILE_BY_ID[piece.id];
  if (explicitFile && imageByFileName[explicitFile]) {
    return imageByFileName[explicitFile];
  }

  const idSlug = toSlug(String(piece.id || "").replace(/^(route|standalone)-/, ""));
  const byId = imageByFileName[`${idSlug}.png`];
  if (byId) return byId;

  const nameSlug = toSlug(piece.name);
  const byName = imageByFileName[`${nameSlug}.png`];
  if (byName) return byName;

  return null;
};

export const getRotationFromDirection = (direction) => {
  if (direction === "north") return 180;
  if (direction === "east") return -90;
  if (direction === "west") return 90;
  return 0;
};

export const getOppositeDirection = (direction) => {
  if (direction === "north") return "south";
  if (direction === "south") return "north";
  if (direction === "east") return "west";
  if (direction === "west") return "east";
  return null;
};
