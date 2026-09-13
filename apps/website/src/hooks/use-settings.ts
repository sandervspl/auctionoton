import useLocalStorageState from 'use-local-storage-state';

type Settings = {
  realm: string;
  region: string;
  faction: string;
};

export function useSettings(initialValues?: Partial<Settings>) {
  const [settings, setSettings] = useLocalStorageState<Settings>('settings', {
    defaultValue: {
      realm: initialValues?.realm ?? 'chaos-bolt',
      region: initialValues?.region ?? 'eu',
      faction: initialValues?.faction ?? 'alliance',
    },
  });

  function setRealm(realm: string) {
    setSettings((settings) => ({ ...settings, realm }));
  }

  function setRegion(region: string) {
    setSettings((settings) => ({ ...settings, region }));
  }

  function setFaction(faction: string) {
    setSettings((settings) => ({ ...settings, faction }));
  }

  return {
    settings,
    setSettings,
    setRealm,
    setRegion,
    setFaction,
  };
}
