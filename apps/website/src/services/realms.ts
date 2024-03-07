import slugify from 'slugify';

export const seasonalRealmsUS = [
  {
    name: 'Chaos Bolt',
    localizedName: 'Chaos Bolt',
    realmId: 1066,
    auctionHouses: [
      {
        auctionHouseId: 507,
        type: 'Alliance',
        lastModified: 1709846403,
      },
      {
        auctionHouseId: 508,
        type: 'Horde',
        lastModified: 1709846403,
      },
    ],
  },
  {
    name: 'Crusader Strike',
    localizedName: 'Crusader Strike',
    realmId: 1065,
    auctionHouses: [
      {
        auctionHouseId: 505,
        type: 'Alliance',
        lastModified: 1709846421,
      },
      {
        auctionHouseId: 506,
        type: 'Horde',
        lastModified: 1709846421,
      },
    ],
  },
  {
    name: 'Lava Lash',
    localizedName: 'Lava Lash',
    realmId: 1061,
    auctionHouses: [
      {
        auctionHouseId: 497,
        type: 'Alliance',
        lastModified: 1709846403,
      },
      {
        auctionHouseId: 498,
        type: 'Horde',
        lastModified: 1709846403,
      },
    ],
  },
  {
    name: 'Living Flame',
    localizedName: 'Living Flame',
    realmId: 1064,
    auctionHouses: [
      {
        auctionHouseId: 503,
        type: 'Alliance',
        lastModified: 1709846417,
      },
      {
        auctionHouseId: 504,
        type: 'Horde',
        lastModified: 1709846417,
      },
    ],
  },
  {
    name: 'Lone Wolf',
    localizedName: 'Lone Wolf',
    realmId: 1063,
    auctionHouses: [
      {
        auctionHouseId: 501,
        type: 'Alliance',
        lastModified: 1709846404,
      },
      {
        auctionHouseId: 502,
        type: 'Horde',
        lastModified: 1709846404,
      },
    ],
  },
  {
    name: 'Penance (AU)',
    localizedName: 'Penance (AU)',
    realmId: 1059,
    auctionHouses: [
      {
        auctionHouseId: 493,
        type: 'Alliance',
        lastModified: 1709846407,
      },
      {
        auctionHouseId: 494,
        type: 'Horde',
        lastModified: 1709846406,
      },
    ],
  },
  {
    name: 'Shadowstrike (AU)',
    localizedName: 'Shadowstrike (AU)',
    realmId: 1060,
    auctionHouses: [
      {
        auctionHouseId: 495,
        type: 'Alliance',
        lastModified: 1709846420,
      },
      {
        auctionHouseId: 496,
        type: 'Horde',
        lastModified: 1709846422,
      },
    ],
  },
  {
    name: 'Wild Growth',
    localizedName: 'Wild Growth',
    realmId: 1062,
    auctionHouses: [
      {
        auctionHouseId: 499,
        type: 'Alliance',
        lastModified: 1709846404,
      },
      {
        auctionHouseId: 500,
        type: 'Horde',
        lastModified: 1709846404,
      },
    ],
  },
];

export const seasonalRealmsEU = [
  {
    name: 'Chaos Bolt',
    localizedName: 'Chaos Bolt',
    realmId: 1072,
    auctionHouses: [
      {
        auctionHouseId: 519,
        type: 'Alliance',
        lastModified: 1709849782,
      },
      {
        auctionHouseId: 520,
        type: 'Horde',
        lastModified: 1709849782,
      },
    ],
  },
  {
    name: 'Crusader Strike',
    localizedName: 'Crusader Strike',
    realmId: 1070,
    auctionHouses: [
      {
        auctionHouseId: 515,
        type: 'Alliance',
        lastModified: 1709849782,
      },
      {
        auctionHouseId: 516,
        type: 'Horde',
        lastModified: 1709849782,
      },
    ],
  },
  {
    name: 'Lava Lash',
    localizedName: 'Lava Lash',
    realmId: 1071,
    auctionHouses: [
      {
        auctionHouseId: 517,
        type: 'Alliance',
        lastModified: 1709849781,
      },
      {
        auctionHouseId: 518,
        type: 'Horde',
        lastModified: 1709849781,
      },
    ],
  },
  {
    name: 'Living Flame',
    localizedName: 'Living Flame',
    realmId: 1069,
    auctionHouses: [
      {
        auctionHouseId: 513,
        type: 'Alliance',
        lastModified: 1709849783,
      },
      {
        auctionHouseId: 514,
        type: 'Horde',
        lastModified: 1709849783,
      },
    ],
  },
  {
    name: 'Lone Wolf',
    localizedName: 'Lone Wolf',
    realmId: 1068,
    auctionHouses: [
      {
        auctionHouseId: 511,
        type: 'Alliance',
        lastModified: 1709849783,
      },
      {
        auctionHouseId: 512,
        type: 'Horde',
        lastModified: 1709849783,
      },
    ],
  },
  {
    name: 'Wild Growth',
    localizedName: 'Wild Growth',
    realmId: 1067,
    auctionHouses: [
      {
        auctionHouseId: 509,
        type: 'Alliance',
        lastModified: 1709849783,
      },
      {
        auctionHouseId: 510,
        type: 'Horde',
        lastModified: 1709849782,
      },
    ],
  },
];

export function getAuctionHouseIds(realms: typeof seasonalRealmsUS | typeof seasonalRealmsEU) {
  return realms.reduce(
    (acc, realm) => {
      const slug = slugify(realm.localizedName, { lower: true });

      acc[slug] = realm.auctionHouses.reduce(
        (acc, ah) => {
          const faction = ah.type.toLowerCase();
          acc[faction] = ah.auctionHouseId;
          return acc;
        },
        {} as Record<'alliance' | 'horde', number>,
      );

      return acc;
    },
    {} as Record<string, { alliance: number; horde: number }>,
  );
}

export const realmDropdownValues = [
  seasonalRealmsEU
    .map((realm) => ({
      value: `${slugify(realm.localizedName)}_eu`,
      label: `${realm.localizedName} (EU)`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
  seasonalRealmsUS
    .filter((realm) => !realm.localizedName.includes('(AU)'))
    .map((realm) => ({
      value: `${slugify(realm.localizedName)}_us`,
      label: `${realm.localizedName} (US)`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
  seasonalRealmsUS
    .filter((realm) => realm.localizedName.includes('(AU)'))
    .map((realm) => ({
      value: `${slugify(realm.localizedName)}_us`,
      label: realm.localizedName,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
].flat();
