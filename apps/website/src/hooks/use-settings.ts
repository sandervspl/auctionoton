import { DEFAULT_REALM } from 'services/auction-house';
import useLocalStorageState from 'use-local-storage-state';

type Settings = {
  realm: string;
  region: string;
  faction: string;
};

export function useSettings(initialValues?: Partial<Settings>) {
  const [settings, setSettings] = useLocalStorageState<Settings>('settings', {
    defaultValue: {
      realm: initialValues?.realm ?? DEFAULT_REALM.realm,
      region: initialValues?.region ?? DEFAULT_REALM.region,
      faction: initialValues?.faction ?? DEFAULT_REALM.faction,
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
