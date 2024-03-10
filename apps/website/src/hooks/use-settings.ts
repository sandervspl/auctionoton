'use client';

import useLocalStorageState from 'use-local-storage-state';

type Settings = {
  realm: string;
  region: string;
  faction: string;
};

export function useSettings() {
  const [settings, setSettings] = useLocalStorageState<Settings>('settings', {
    defaultValue: {
      realm: 'chaos-bolt',
      region: 'eu',
      faction: 'alliance',
    },
  });

  function setRealm(realm: string) {
    setSettings((settings) => {
      settings.realm = realm;
      return settings;
    });
  }

  function setRegion(region: string) {
    setSettings((settings) => {
      settings.region = region;
      return settings;
    });
  }

  function setFaction(faction: string) {
    setSettings((settings) => {
      settings.faction = faction;
      return settings;
    });
  }

  return {
    settings,
    setSettings,
    setRealm,
    setRegion,
    setFaction,
  };
}
