import * as i from './types';
import AsyncStorage from './asyncStorage';

const realms: Realms = {
  eu: {
    english: [
      'Amnennar',
      'Ashbringer',
      'Auberdine',
      'Bloodfang',
      'Celebras',
      'Dragon\'s Call',
      'Dragonfang',
      'Dreadmist',
      'Earthshaker',
      'Everlook',
      'Finkle',
      'Firemaw',
      'Flamelash',
      'Gandling',
      'Gehennas',
      'Golemagg',
      'Heartstriker',
      'Hydraxian Waterlords',
      'Judgement',
      'Lakeshire',
      'Lucifron',
      'Mandokir',
      'Mirage Raceway',
      'Mograine',
      'Nethergarde Keep',
      'Noggenfogger',
      'Patchwerk',
      'Pyrewood Village',
      'Razorfen',
      'Razorgore',
      'Shazzrah',
      'Skullflame',
      'Stonespine',
      'Sulfuron',
      'Ten Storms',
      'Transcendence',
      'Venoxis',
      'Zandalar Tribe',
    ],
    russian: [
      {
        russian: 'Вестник Рока',
        english: 'Doomsayer',
      },
      {
        russian: 'Змейталак',
        english: 'Wyrmthalak',
      },
      {
        russian: 'Пламегор',
        english: 'Flamegor',
      },
      {
        russian: 'Рок-Делар',
        english: 'Rhokdelar',
      },
      {
        russian: 'Хроми',
        english: 'Chromie',
      },
    ],
  },
  us: [
    'Anathema',
    'Arcanite Reaper',
    'Arugal',
    'Ashkandi',
    'Atiesh',
    'Azuresong',
    'Benediction',
    'Bigglesworth',
    'Blaumeux',
    'Bloodsail Buccaneers',
    'Deviate Delight',
    'Earthfury',
    'Faerlina',
    'Fairbanks',
    'Felstriker',
    'Grobbulus',
    'Heartseeker',
    'Herod',
    'Incendius',
    'Kirtonos',
    'Kromcrush',
    'Kurinnaxx',
    'Loatheb',
    'Mankrik',
    'Myzrael',
    'Netherwind',
    'Old Blanchy',
    'Pagle',
    'Rattlegore',
    'Remulos',
    'Skeram',
    'Smolderweb',
    'Stalagg',
    'Sul\'thraze',
    'Sulfuras',
    'Thalnos',
    'Thunderfury',
    'Westfall',
    'Whitemane',
    'Windseeker',
    'Yojamba',
  ],
};

const fillServerList = (region: i.UserData['region'], selectedServer?: string): void => {
  const serverSelect = document.querySelector('#server') as HTMLSelectElement | null;

  if (!serverSelect) {
    return;
  }

  // Remove all existing options
  const amt = serverSelect.options.length;

  for (let i = amt; i >= 0; i--) {
    serverSelect.remove(i);
  }

  // Add options
  if (region === 'eu') {
    let subregion: keyof typeof realms.eu;

    for (subregion in realms[region]) {
      for (const realm of realms[region][subregion]) {
        const option = document.createElement('option');

        if (typeof realm === 'string') {
          const slug = realm
            .toLowerCase()
            .replace('\'', '')
            .replace(' ', '-');

          option.value = JSON.stringify({
            name: realm,
            slug,
          });
          option.innerText = realm;
          option.selected = realm === selectedServer;
        }

        if (typeof realm === 'object') {
          option.value = JSON.stringify({
            name: realm.russian,
            slug: realm.english.toLowerCase(),
          });
          option.innerText = realm.russian;
          option.selected = realm.russian === selectedServer;
        }

        serverSelect.appendChild(option);
      }
    }
  } else if (region === 'us') {
    for (const realm of realms[region]) {
      const option = document.createElement('option');

      const slug = realm
        .toLowerCase()
        .replace('\'', '')
        .replace(' ', '-');

      option.value = JSON.stringify({
        name: realm,
        slug,
      });
      option.innerText = realm;
      option.selected = realm === selectedServer;

      serverSelect.appendChild(option);
    }
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const regionSelect = document.querySelector('#region') as HTMLSelectElement | null;
  const serverSelect = document.querySelector('#server') as HTMLSelectElement | null;
  const factionSelect = document.querySelector('#server') as HTMLSelectElement | null;

  if (!regionSelect || !serverSelect || !factionSelect) {
    return;
  }

  const user = await AsyncStorage.get('user');

  if (!user) {
    return;
  }

  // Initial list fill
  fillServerList(user.region, user.server.name);


  // Set faction/region according to user's selection
  const factionOption = document.querySelector(`option[value="${user.faction}"]`) as HTMLOptionElement | null;
  const regionOption = document.querySelector(`option[value="${user.region}"]`) as HTMLOptionElement | null;

  if (factionOption) {
    factionOption.selected = true;
  }

  if (regionOption) {
    regionOption.selected = true;
  }


  // Fill list according to selected region
  regionSelect.addEventListener('change', (e) => {
    // @ts-ignore
    const { value } = e.target;

    fillServerList(value);
  });

  // Save to storage on form submit
  document.querySelector('#submit')?.addEventListener('click', async () => {
    const form = document.querySelector('form');

    if (!form) {
      return;
    }

    // Remove success message
    const resultElement = document.querySelector('#result') as HTMLElement | null;

    if (resultElement) {
      resultElement.style.display = 'none';
    }

    const formValues = Object.values(form).reduce((obj,field) => {
      obj[field.name] = field.value;

      return obj;
    }, {});

    await AsyncStorage.set({
      user: {
        region: formValues.region,
        server: JSON.parse(formValues.server),
        faction: formValues.faction,
      },
    });

    if (resultElement) {
      resultElement.style.display = 'block';
    }
  });
});

type Realm = string | { english: string; russian: string }

type Realms = {
  eu: {
    english: Realm[];
    russian: Realm[];
  };
  us: string[];
}
