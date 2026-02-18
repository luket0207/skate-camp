const withUpgrades = (name, level, upgrades = []) => ({
  name,
  level,
  upgrades: upgrades.map((upgrade) => ({ name: upgrade.name, level: upgrade.level })),
});

export const TRICK_TREES = {
  Rollerblader: {
    stall: [
      {
        core: "Frontside",
        level: 1,
        variants: [withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]), withUpgrades("Half Cab", 2, [{ name: "360 In", level: 4 }])],
      },
      {
        core: "Backside",
        level: 1,
        variants: [withUpgrades("180 Out", 1, [{ name: "360 Out", level: 5 }]), withUpgrades("Zero Spin", 2, [{ name: "Full Cab", level: 3 }])],
      },
      {
        core: "Makio",
        level: 2,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Half Cab", 2, [{ name: "Full Cab", level: 3 }]), withUpgrades("Fishbrain", 4)],
      },
      {
        core: "Soul",
        level: 2,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Half Cab", 2, [{ name: "Full Cab", level: 4 }]), withUpgrades("Topside", 3)],
      },
      {
        core: "Mizou",
        level: 2,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Half Cab", 2, [{ name: "Full Cab", level: 4 }]), withUpgrades("Topside", 3)],
      },
      {
        core: "Acid",
        level: 3,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Half Cab", 2, [{ name: "Full Cab", level: 4 }]), withUpgrades("Topside", 3)],
      },
      {
        core: "Pornstar",
        level: 3,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Half Cab", 2, [{ name: "Full Cab", level: 4 }]), withUpgrades("Topside", 3)],
      },
      {
        core: "Unity",
        level: 3,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Half Cab", 2, [{ name: "Full Cab", level: 4 }]), withUpgrades("Savannah", 3)],
      },
    ],
    grind: [
      {
        core: "Frontside",
        level: 1,
        variants: [
          withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]),
          withUpgrades("Half Cab", 2, [{ name: "Full Cab", level: 5 }]),
          withUpgrades("Royal", 3),
          withUpgrades("Fahrv", 4),
        ],
      },
      {
        core: "Backside",
        level: 1,
        variants: [
          withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]),
          withUpgrades("Half Cab", 2, [{ name: "Full Cab", level: 5 }]),
          withUpgrades("Royal", 3),
          withUpgrades("Fahrv", 4),
        ],
      },
      {
        core: "Makio",
        level: 2,
        variants: [
          withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]),
          withUpgrades("Half Cab", 2, [{ name: "Ally Oop", level: 5 }]),
          withUpgrades("Fishbrain", 4),
        ],
      },
      {
        core: "Soul",
        level: 2,
        variants: [
          withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]),
          withUpgrades("Half Cab", 2, [{ name: "Ally Oop", level: 5 }]),
          withUpgrades("Top Soul", 3),
        ],
      },
      {
        core: "Mizou",
        level: 2,
        variants: [
          withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]),
          withUpgrades("Half Cab", 2, [{ name: "Ally Oop", level: 5 }]),
          withUpgrades("Sweatstance", 3),
        ],
      },
      {
        core: "Acid",
        level: 3,
        variants: [
          withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]),
          withUpgrades("Half Cab", 2, [{ name: "Ally Oop", level: 5 }]),
          withUpgrades("Top Acid", 3),
        ],
      },
      {
        core: "Pornstar",
        level: 3,
        variants: [
          withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]),
          withUpgrades("Half Cab", 2, [{ name: "Ally Oop", level: 5 }]),
          withUpgrades("Top Porn", 3),
        ],
      },
      {
        core: "Unity",
        level: 3,
        variants: [
          withUpgrades("Fakie Out", 1, [{ name: "360 Out", level: 5 }]),
          withUpgrades("Half Cab", 2, [{ name: "Ally Oop", level: 5 }]),
          withUpgrades("Savannah", 3),
        ],
      },
    ],
    tech: [
      {
        core: "Manual",
        level: 1,
        variants: [withUpgrades("Heel Manual", 1, [{ name: "Toe Manual", level: 2 }]), withUpgrades("Fakie", 3), withUpgrades("One Foot", 4)],
      },
      {
        core: "Cess Slide",
        level: 3,
        variants: [withUpgrades("Unity Cess Slide", 1, [{ name: "One Foot", level: 5 }]), withUpgrades("180", 2, [{ name: "360", level: 4 }])],
      },
    ],
    spin: [
      {
        core: "180",
        level: 1,
        variants: [withUpgrades("Abstract", 1), withUpgrades("Mute Grab", 2), withUpgrades("Indy Grab", 3), withUpgrades("Safety Grab", 4), withUpgrades("Method Grab", 5)],
      },
      {
        core: "360",
        level: 2,
        variants: [withUpgrades("Abstract", 1), withUpgrades("Mute Grab", 2), withUpgrades("Indy Grab", 3), withUpgrades("Safety Grab", 4), withUpgrades("Method Grab", 5)],
      },
      {
        core: "540",
        level: 3,
        variants: [withUpgrades("Abstract", 1), withUpgrades("Mute Grab", 2), withUpgrades("Indy Grab", 3), withUpgrades("Safety Grab", 4), withUpgrades("Method Grab", 5)],
      },
    ],
    bigAir: [
      {
        core: "720",
        level: 2,
        variants: [withUpgrades("Abstract", 1), withUpgrades("Mute Grab", 2), withUpgrades("Indy Grab", 3), withUpgrades("Safety Grab", 4), withUpgrades("Method Grab", 5)],
      },
      {
        core: "900",
        level: 3,
        variants: [withUpgrades("Abstract", 1), withUpgrades("Mute Grab", 2), withUpgrades("Indy Grab", 3), withUpgrades("Safety Grab", 4), withUpgrades("Method Grab", 5)],
      },
      {
        core: "Front Flip",
        level: 3,
        variants: [
          withUpgrades("Bio", 3, [{ name: "360", level: 5 }]),
          withUpgrades("Mute Grab", 1),
          withUpgrades("Indy Grab", 2),
          withUpgrades("Safety Grab", 3),
          withUpgrades("Method Grab", 4),
        ],
      },
      {
        core: "Back Flip",
        level: 3,
        variants: [
          withUpgrades("180", 3, [{ name: "360", level: 5 }]),
          withUpgrades("Mute Grab", 1),
          withUpgrades("Indy Grab", 2),
          withUpgrades("Safety Grab", 3),
          withUpgrades("Method Grab", 4),
        ],
      },
      {
        core: "Cork 540",
        level: 3,
        variants: [
          withUpgrades("720", 3, [{ name: "900", level: 5 }]),
          withUpgrades("Mute Grab", 1),
          withUpgrades("Indy Grab", 2),
          withUpgrades("Safety Grab", 3),
          withUpgrades("Method Grab", 4),
        ],
      },
    ],
  },
  Skateboarder: {
    stall: [
      {
        core: "Backside Axle Stall",
        level: 1,
        variants: [
          withUpgrades("Fakie Out", 1),
          withUpgrades("Fakie In", 2),
          withUpgrades("Shuv In", 3, [{ name: "360 Shuv In", level: 5 }]),
          withUpgrades("Kickflip In", 4, [{ name: "Heelflip In", level: 5 }]),
        ],
      },
      {
        core: "Frontside Axle Stall",
        level: 1,
        variants: [
          withUpgrades("Fakie Out", 1),
          withUpgrades("Fakie In", 2),
          withUpgrades("Shuv In", 3, [{ name: "360 Shuv In", level: 5 }]),
          withUpgrades("Kickflip In", 4, [{ name: "Heelflip In", level: 5 }]),
        ],
      },
      {
        core: "Rock to Fakie",
        level: 1,
        variants: [
          withUpgrades("Rock and Roll", 1),
          withUpgrades("Half Cab", 2),
          withUpgrades("Shuv In", 3, [{ name: "360 Shuv In", level: 5 }]),
          withUpgrades("Kickflip In", 4, [{ name: "Heelflip In", level: 5 }]),
        ],
      },
      {
        core: "Nose Stall",
        level: 2,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Shuv In", 3, [{ name: "360 Shuv In", level: 5 }]), withUpgrades("Kickflip In", 4, [{ name: "Heelflip In", level: 5 }])],
      },
      {
        core: "Tail Stall",
        level: 2,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Shuv In", 3, [{ name: "360 Shuv In", level: 5 }]), withUpgrades("Kickflip In", 4, [{ name: "Heelflip In", level: 5 }])],
      },
      {
        core: "Smith Stall",
        level: 2,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Shuv In", 3, [{ name: "360 Shuv In", level: 5 }]), withUpgrades("Kickflip In", 4, [{ name: "Heelflip In", level: 5 }])],
      },
      {
        core: "Feeble Stall",
        level: 2,
        variants: [withUpgrades("Fakie Out", 1), withUpgrades("Shuv In", 3, [{ name: "360 Shuv In", level: 5 }]), withUpgrades("Kickflip In", 4, [{ name: "Heelflip In", level: 5 }])],
      },
      {
        core: "Blunt Stall",
        level: 3,
        variants: [withUpgrades("180 In", 2), withUpgrades("Shuv In", 3, [{ name: "360 Shuv In", level: 5 }]), withUpgrades("Kickflip In", 4, [{ name: "Heelflip In", level: 5 }])],
      },
    ],
    grind: [
      "Boardslide",
      "50-50",
      "5-0",
      "Nosegrind",
      "Smith Grind",
      "Feeble Grind",
      "Crooked Grind",
      "Bluntslide",
      "Noseblunt",
    ].map((core, index) => ({
      core,
      level: index < 2 ? 1 : index < 6 ? 2 : 3,
      variants: [
        withUpgrades("Fakie Out", 1),
        withUpgrades("Half Cab", 2, [{ name: index === 0 ? "Lipslide" : "Ally Oop", level: 5 }]),
        withUpgrades("Shuv", 3, [{ name: "360 Shuv", level: 5 }]),
        withUpgrades("Shuv Out", 2, [{ name: "360 Shuv Out", level: 4 }]),
        withUpgrades("Kickflip", 4, [{ name: "Heelflip", level: 5 }]),
        withUpgrades("Kickflip Out", 3, [{ name: "Heelflip Out", level: 4 }]),
      ],
    })),
    flip: [
      {
        core: "Shuv",
        level: 1,
        variants: [withUpgrades("Fakie/Nollie", 2), withUpgrades("180", 1, [{ name: "Big Spin", level: 4 }]), withUpgrades("360 Shuv", 4, [{ name: "Impossible", level: 5 }])],
      },
      {
        core: "Kickflip",
        level: 2,
        variants: [withUpgrades("Fakie/Nollie", 2), withUpgrades("Frontside", 2, [{ name: "Backside", level: 3 }]), withUpgrades("Varial", 4, [{ name: "360 Flip", level: 5 }]), withUpgrades("Double", 5), withUpgrades("360", 5)],
      },
      {
        core: "Heelflip",
        level: 2,
        variants: [withUpgrades("Fakie/Nollie", 2), withUpgrades("Frontside", 2, [{ name: "Backside", level: 3 }]), withUpgrades("Varial", 4, [{ name: "Laser", level: 5 }]), withUpgrades("Double", 5), withUpgrades("360", 5)],
      },
      {
        core: "Hardflip",
        level: 3,
        variants: [withUpgrades("Fakie/Nollie", 3), withUpgrades("Frontside", 4, [{ name: "Backside", level: 5 }]), withUpgrades("360", 5)],
      },
    ],
    grab: [
      { core: "Indy Grab", level: 1 },
      { core: "Melon Grab", level: 1 },
      { core: "Mute Grab", level: 1 },
      { core: "Method Grab", level: 2 },
      { core: "Nosegrab", level: 2 },
      { core: "Tailgrab", level: 2 },
      { core: "Lien Grab", level: 3 },
      { core: "Seatbelt Grab", level: 3 },
    ].map((item) => ({
      core: item.core,
      level: item.level,
      variants: [withUpgrades("180", 1, [{ name: "360", level: 3 }, { name: "540", level: 5 }])],
    })),
    bigAir: [
      {
        core: "Cab (Indy)",
        level: 1,
        variants: [
          withUpgrades("Mute Grab", 1, [{ name: "Tail Grab", level: 2 }, { name: "Seatbelt Grab", level: 3 }]),
          withUpgrades("360", 2, [{ name: "540", level: 3 }, { name: "720", level: 5 }]),
        ],
      },
      { core: "Japan Air", level: 1, variants: [withUpgrades("360", 2, [{ name: "540", level: 3 }, { name: "720", level: 5 }])] },
      { core: "Airwalk", level: 2, variants: [withUpgrades("360", 2, [{ name: "540", level: 3 }, { name: "720", level: 5 }])] },
      { core: "Kickflip Indy", level: 2, variants: [withUpgrades("360", 2, [{ name: "540", level: 3 }, { name: "720", level: 5 }])] },
      { core: "Heelflip Indy", level: 2, variants: [withUpgrades("360", 2, [{ name: "540", level: 3 }, { name: "720", level: 5 }])] },
      { core: "Christ Air", level: 2, variants: [withUpgrades("360", 2, [{ name: "540", level: 3 }, { name: "720", level: 5 }])] },
      {
        core: "McTwist (Indy)",
        level: 3,
        variants: [withUpgrades("Mute Grab", 1, [{ name: "Tail Grab", level: 2 }]), withUpgrades("720", 4, [{ name: "900", level: 5 }])],
      },
      {
        core: "Backflip (Indy)",
        level: 3,
        variants: [withUpgrades("Mute Grab", 1, [{ name: "Tail Grab", level: 2 }]), withUpgrades("180", 4, [{ name: "360", level: 5 }])],
      },
    ],
  },
};

export const TRICK_TYPES_BY_SPORT = {
  Rollerblader: ["stall", "grind", "tech", "spin", "bigAir"],
  Skateboarder: ["stall", "grind", "flip", "grab", "bigAir"],
};
