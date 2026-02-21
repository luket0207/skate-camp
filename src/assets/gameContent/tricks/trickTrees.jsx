const m = (name, level, placement, options = {}) => ({
  kind: "variant",
  name,
  level,
  cost: level,
  placement,
  parentVariant: name,
  lockedBy: options.lockedBy || null,
});

const u = (parentVariant, name, level, placement, options = {}) => ({
  kind: "upgrade",
  name,
  level,
  cost: level,
  placement,
  parentVariant,
  lockedBy: options.lockedBy || null,
});

const lock = (type, core) => ({ type, core });

const core = (name, level, cost, modifiers = []) => ({
  core: name,
  level,
  cost,
  modifiers,
});

export const TRICK_TREES = {
  Rollerblader: {
    stall: [
      core("Frontside", 1, 5, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 3, "A"), m("Half Cab", 2, "B"), u("Half Cab", "360", 5, "B")]),
      core("Backside", 1, 5, [m("180 Out", 1, "A"), u("180 Out", "360 Out", 3, "A"), m("Zero Spin", 2, "B"), u("Zero Spin", "Full Cab", 5, "B")]),
      core("Makio", 2, 10, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 4, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Full Cab", 5, "B"), m("Fishbrain", 4, "R")]),
      core("Soul", 2, 10, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 4, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Full Cab", 5, "B"), m("Topside", 3, "R")]),
      core("Mizou", 2, 10, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 4, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Full Cab", 5, "B"), m("Sweatstance", 3, "R")]),
      core("Acid", 3, 20, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 4, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Full Cab", 5, "B"), m("Top Acid", 3, "R")]),
      core("Pornstar", 3, 20, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 4, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Full Cab", 5, "B"), m("Top Porn", 3, "R")]),
      core("Unity", 3, 20, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 4, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Full Cab", 5, "B"), m("Savannah", 3, "R")]),
    ],
    grind: [
      core("Frontside", 1, 5, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 5, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Full Cab", 5, "B"), m("Royal", 3, "R"), u("Royal", "Fahrv", 4, "R")]),
      core("Backside", 1, 5, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 5, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Full Cab", 5, "B"), m("Royal", 3, "R"), u("Royal", "Fahrv", 4, "R")]),
      core("Makio", 2, 10, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 5, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Ally Oop", 5, "B"), m("Fishbrain", 4, "R")]),
      core("Soul", 2, 10, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 5, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Ally Oop", 5, "B"), m("Top Soul", 3, "R")]),
      core("Mizou", 2, 10, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 5, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Ally Oop", 5, "B"), m("Sweatstance", 3, "R")]),
      core("Acid", 3, 20, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 5, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Ally Oop", 5, "B"), m("Top Acid", 3, "R")]),
      core("Pornstar", 3, 20, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 5, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Ally Oop", 5, "B"), m("Top Porn", 3, "R")]),
      core("Unity", 3, 20, [m("Fakie Out", 1, "A"), u("Fakie Out", "360 Out", 5, "A"), m("Half Cab", 2, "B"), u("Half Cab", "Ally Oop", 5, "B"), m("Savannah", 3, "R")]),
    ],
    tech: [
      core("Manual", 1, 5, [m("Heel Manual", 1, "R"), u("Heel Manual", "Toe Manual", 2, "R"), m("Fakie", 3, "B"), m("One Foot", 4, "A")]),
      core("Unity Cess Slide", 2, 10, [m("180", 2, "B"), u("180", "360", 3, "B"), m("180 Out", 1, "A"), u("180 Out", "360 Out", 4, "A")]),
      core("Cess Slide", 3, 20, [m("180", 1, "B"), u("180", "360", 3, "B"), m("Back Foot Cess", 3, "R"), u("Back Foot Cess", "Front Foot Cess", 5, "R"), m("180 Out", 1, "A"), u("180 Out", "360 Out", 4, "A")]),
    ],
    spin: [
      core("180", 1, 5, [m("Abstract", 1, "A"), u("Abstract", "Mute Grab", 2, "A"), u("Abstract", "Indy Grab", 3, "A"), u("Abstract", "Safety Grab", 4, "A"), u("Abstract", "Method Grab", 5, "A")]),
      core("360", 2, 10, [m("Abstract", 1, "A"), u("Abstract", "Mute Grab", 2, "A"), u("Abstract", "Indy Grab", 3, "A"), u("Abstract", "Safety Grab", 4, "A"), u("Abstract", "Method Grab", 5, "A")]),
      core("540", 3, 20, [m("Abstract", 1, "A"), u("Abstract", "Mute Grab", 2, "A"), u("Abstract", "Indy Grab", 3, "A"), u("Abstract", "Safety Grab", 4, "A"), u("Abstract", "Method Grab", 5, "A")]),
    ],
    bigAir: [
      core("720", 2, 10, [m("Abstract", 1, "A"), u("Abstract", "Mute Grab", 2, "A"), u("Abstract", "Indy Grab", 3, "A"), u("Abstract", "Safety Grab", 4, "A"), u("Abstract", "Method Grab", 5, "A")]),
      core("900", 3, 20, [m("Abstract", 1, "A"), u("Abstract", "Mute Grab", 2, "A"), u("Abstract", "Indy Grab", 3, "A"), u("Abstract", "Safety Grab", 4, "A"), u("Abstract", "Method Grab", 5, "A")]),
      core("Front Flip", 3, 20, [m("Bio", 3, "R"), u("Bio", "360", 5, "R"), m("Mute Grab", 1, "A"), u("Mute Grab", "Indy Grab", 2, "A"), u("Mute Grab", "Safety Grab", 3, "A"), u("Mute Grab", "Method Grab", 4, "A")]),
      core("Back Flip", 3, 20, [m("180", 3, "B"), u("180", "360", 5, "B"), m("Mute Grab", 1, "A"), u("Mute Grab", "Indy Grab", 2, "A"), u("Mute Grab", "Safety Grab", 3, "A"), u("Mute Grab", "Method Grab", 4, "A")]),
      core("Cork 540", 3, 20, [m("Cork 720", 3, "R"), u("Cork 720", "Cork 900", 5, "R"), m("Mute Grab", 1, "A"), u("Mute Grab", "Indy Grab", 2, "A"), u("Mute Grab", "Safety Grab", 3, "A"), u("Mute Grab", "Method Grab", 4, "A")]),
    ],
  },
  Skateboarder: {
    stall: [
      core("Backside Axle Stall", 1, 5, [
        m("Fakie Out", 1, "A"),
        m("Fakie", 2, "B"),
        m("Shuv In Back Axle", 3, "R"),
        u("Shuv In Back Axle", "360 Shuv In Back Axle", 4, "R", { lockedBy: lock("tech", "Shuv") }),
        u("Shuv In Back Axle", "Kickflip Back Axle", 5, "R", { lockedBy: lock("tech", "Kickflip") }),
        u("Shuv In Back Axle", "Heelflip Back Axle", 5, "R", { lockedBy: lock("tech", "Heelflip") }),
      ]),
      core("Frontside Axle Stall", 1, 5, [
        m("Fakie Out", 1, "A"),
        m("Fakie", 2, "B"),
        m("Shuv In Front Axle", 3, "R"),
        u("Shuv In Front Axle", "360 Shuv Front Axle", 5, "R", { lockedBy: lock("tech", "Shuv") }),
        u("Shuv In Front Axle", "Kickflip Front Axle", 5, "R", { lockedBy: lock("tech", "Kickflip") }),
        u("Shuv In Front Axle", "Heelflip Front Axle", 5, "R", { lockedBy: lock("tech", "Heelflip") }),
      ]),
      core("Rock Fakie", 1, 5, [
        m("Rock and Roll", 1, "R"),
        u("Rock and Roll", "Big Spin Rock and Roll", 3, "R", { lockedBy: lock("tech", "Shuv") }),
        u("Rock and Roll", "Kickflip Rock and Roll", 5, "R", { lockedBy: lock("tech", "Kickflip") }),
        u("Rock and Roll", "Heelflip Rock and Roll", 5, "R", { lockedBy: lock("tech", "Heelflip") }),
      ]),
      core("Nose Stall", 2, 10, [m("Fakie Out", 1, "A"), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 4, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 5, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") })]),
      core("Tail Stall", 2, 10, [m("Fakie Out", 1, "A"), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 4, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 5, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") })]),
      core("Smith Stall", 2, 10, [m("Fakie Out", 1, "A"), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 4, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 5, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") })]),
      core("Feeble Stall", 2, 10, [m("Fakie Out", 1, "A"), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 4, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 5, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") })]),
      core("Blunt Stall", 3, 20, [m("180 Out", 2, "A"), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 4, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 5, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") })]),
    ],
    grind: [
      core("Boardslide", 1, 5, [m("Lipslide", 5, "R"), m("Shuv", 3, "B"), u("Shuv", "Kickflip", 5, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 3, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 5, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 5, "A", { lockedBy: lock("tech", "Heelflip") })]),
      core("50-50", 1, 5, [m("Half Cab 50-50", 2, "R"), u("Half Cab 50-50", "Ally Oop 50-50", 5, "R", { lockedBy: lock("spin", "180") }), m("Shuv", 3, "B"), u("Shuv", "Kickflip", 5, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 3, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 5, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 5, "A", { lockedBy: lock("tech", "Heelflip") })]),
      core("5-0", 2, 10, [m("Half Cab 5-0", 2, "R"), u("Half Cab 5-0", "Alley Oop 5-0", 5, "R"), m("Shuv", 3, "B"), u("Shuv", "Kickflip", 5, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 3, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 5, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 5, "A", { lockedBy: lock("tech", "Heelflip") })]),
      core("Nosegrind", 2, 10, [m("Half Cab Nosegrind", 2, "R"), u("Half Cab Nosegrind", "Alley Oop Nosegrind", 5, "R", { lockedBy: lock("spin", "180") }), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 5, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 4, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 2, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "360 Shuv Out", 4, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 3, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 4, "A", { lockedBy: lock("tech", "Heelflip") })]),
      core("Smith Grind", 2, 10, [m("Half Cab Smith Grind", 2, "R"), u("Half Cab Smith Grind", "Alley Oop Smith Grind", 5, "R", { lockedBy: lock("spin", "180") }), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 5, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 4, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 2, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "360 Shuv Out", 4, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 3, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 4, "A", { lockedBy: lock("tech", "Heelflip") })]),
      core("Feeble Grind", 2, 10, [m("Half Cab Feeble Grind", 2, "R"), u("Half Cab Feeble Grind", "Alley Oop Feeble Grind", 5, "R", { lockedBy: lock("spin", "180") }), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 5, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 4, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 2, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "360 Shuv Out", 4, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 3, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 4, "A", { lockedBy: lock("tech", "Heelflip") })]),
      core("Crooked Grind", 3, 20, [m("Half Cab Crooked Grind", 2, "R"), u("Half Cab Crooked Grind", "Alley Oop Crooked Grind", 5, "R"), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 5, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 4, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 2, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "360 Shuv Out", 4, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 3, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 4, "A", { lockedBy: lock("tech", "Heelflip") })]),
      core("Bluntslide", 3, 20, [m("Half Cab Bluntslide", 2, "R"), u("Half Cab Bluntslide", "Alley Oop Bluntslide", 5, "R", { lockedBy: lock("spin", "180") }), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 5, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 4, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 2, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "360 Shuv Out", 4, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 3, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 4, "A", { lockedBy: lock("tech", "Heelflip") })]),
      core("Noseblunt", 3, 20, [m("Half Cab Noseblunt", 2, "R"), u("Half Cab Noseblunt", "Alley Oop Noseblunt", 5, "R", { lockedBy: lock("spin", "180") }), m("Shuv", 3, "B"), u("Shuv", "360 Shuv", 5, "B", { lockedBy: lock("tech", "Shuv") }), u("Shuv", "Kickflip", 4, "B", { lockedBy: lock("tech", "Kickflip") }), u("Shuv", "Heelflip", 5, "B", { lockedBy: lock("tech", "Heelflip") }), m("Fakie Out", 1, "A"), u("Fakie Out", "Shuv Out", 2, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "360 Shuv Out", 4, "A", { lockedBy: lock("tech", "Shuv") }), u("Fakie Out", "Kickflip Out", 3, "A", { lockedBy: lock("tech", "Kickflip") }), u("Fakie Out", "Heelflip Out", 4, "A", { lockedBy: lock("tech", "Heelflip") })]),
    ],
    tech: [
      core("Shuv", 1, 5, [m("Fakie", 1, "B1"), u("Fakie", "Nollie", 3, "B1"), m("Big Spin", 2, "R"), u("Big Spin", "360 Shuv", 4, "R"), u("Big Spin", "Impossible", 5, "R")]),
      core("Kickflip", 2, 10, [m("Fakie", 1, "B1"), u("Fakie", "Nollie", 3, "B1"), m("Frontside", 2, "B2"), u("Frontside", "Backside", 3, "B2", { lockedBy: lock("spin", "180") }), u("Frontside", "360", 5, "B2", { lockedBy: lock("spin", "360") }), m("Varial Kickflip", 4, "R"), u("Varial Kickflip", "360 Flip", 5, "R")]),
      core("Heelflip", 2, 10, [m("Fakie", 1, "B1"), u("Fakie", "Nollie", 3, "B1"), m("Frontside", 2, "B2"), u("Frontside", "Backside", 3, "B2", { lockedBy: lock("spin", "180") }), u("Frontside", "360", 5, "B2", { lockedBy: lock("spin", "360") }), m("Varial Heel", 4, "R"), u("Varial Heel", "Laser", 5, "R")]),
      core("Hardflip", 3, 20, [m("Fakie", 1, "B1"), u("Fakie", "Nollie", 3, "B1"), m("Frontside", 2, "B2"), u("Frontside", "Backside", 3, "B2", { lockedBy: lock("spin", "180") }), u("Frontside", "360", 5, "B2", { lockedBy: lock("spin", "360") }), m("Dolphin Flip", 3, "R")]),
    ],
    spin: [
      core("180", 1, 5, [m("Indy Grab", 2, "A"), u("Indy Grab", "Mute Grab", 3, "A"), u("Indy Grab", "Safety Grab", 4, "A"), u("Indy Grab", "Method Grab", 5, "A")]),
      core("360", 2, 10, [m("Indy Grab", 2, "A"), u("Indy Grab", "Mute Grab", 3, "A"), u("Indy Grab", "Safety Grab", 4, "A"), u("Indy Grab", "Method Grab", 5, "A")]),
      core("540", 3, 20, [m("Indy Grab", 2, "A"), u("Indy Grab", "Mute Grab", 3, "A"), u("Indy Grab", "Safety Grab", 4, "A"), u("Indy Grab", "Method Grab", 5, "A")]),
    ],
    bigAir: [
      core("Indy Grab", 1, 5, [m("Mute Grab", 1, "R"), u("Mute Grab", "Tail Grab", 2, "R"), u("Mute Grab", "Seatbelt Grab", 3, "R"), m("Fakie", 2, "B"), u("Fakie", "360", 3, "B", { lockedBy: lock("spin", "360") }), u("Fakie", "540", 5, "B", { lockedBy: lock("spin", "540") })]),
      core("Japan Air", 1, 5, [m("Fakie", 2, "B"), u("Fakie", "360", 3, "B", { lockedBy: lock("spin", "360") }), u("Fakie", "540", 5, "B", { lockedBy: lock("spin", "540") })]),
      core("Airwalk", 2, 10, [m("Fakie", 2, "B"), u("Fakie", "360", 3, "B", { lockedBy: lock("spin", "360") }), u("Fakie", "540", 5, "B", { lockedBy: lock("spin", "540") })]),
      core("Kickflip Indy", 2, 10, [m("Fakie", 2, "B"), u("Fakie", "360", 3, "B", { lockedBy: lock("spin", "360") }), u("Fakie", "540", 5, "B", { lockedBy: lock("spin", "540") })]),
      core("Heelflip Indy", 2, 10, [m("Fakie", 2, "B"), u("Fakie", "360", 3, "B", { lockedBy: lock("spin", "360") }), u("Fakie", "540", 5, "B", { lockedBy: lock("spin", "540") })]),
      core("Christ Air", 2, 10, [m("Fakie", 2, "B"), u("Fakie", "360", 3, "B", { lockedBy: lock("spin", "360") }), u("Fakie", "540", 5, "B", { lockedBy: lock("spin", "540") })]),
      core("McTwist", 3, 20, [m("720", 4, "B1"), u("720", "900", 5, "B1"), m("Mute", 1, "B2"), u("Mute", "Tail Grab", 2, "B2")]),
      core("Backflip (Indy)", 3, 20, [m("180", 4, "B1"), u("180", "360", 5, "B1"), m("Mute Grab", 1, "B2"), u("Mute Grab", "Tail Grab", 2, "B2")]),
    ],
  },
};

export const TRICK_TYPES_BY_SPORT = {
  Rollerblader: ["stall", "grind", "tech", "spin", "bigAir"],
  Skateboarder: ["stall", "grind", "tech", "spin", "bigAir"],
};

