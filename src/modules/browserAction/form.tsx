import * as i from 'types';
import React from 'react';
import ReactDOM from 'react-dom';

import { useStore } from 'state/store';
import useServerList from 'hooks/useServerList';


export const Form: React.FC = () => {
  const storage = useStore((store) => store.storage);
  const [region, setRegion] = React.useState<i.Regions>(storage.user.region);
  const [server, setServer] = React.useState(JSON.stringify(storage.user.server));
  const [faction, setFaction] = React.useState<i.Factions>(storage.user.faction);
  const [saved, setSaved] = React.useState(false);
  const serverList = useServerList(region);

  React.useEffect(() => {
    const serverSlugs = serverList.map((elem) => JSON.parse(elem.props.value).slug);

    if (serverSlugs.includes(JSON.parse(server).slug)) {
      return;
    }

    if (serverList.length === 0) {
      return;
    }

    setServer(serverList[0].props.value);
  }, [serverList]);

  const onSubmit = async () => {
    setSaved(false);

    await storage.actions.save('user', (draftState) => {
      draftState.region = region;
      draftState.server = JSON.parse(server);
      draftState.faction = faction;
    });

    setSaved(true);
  };

  const onRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRegion(e.target.value as i.Regions);
  };

  const onServerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setServer(e.target.value);
  };

  const onFactionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFaction(e.target.value as i.Factions);
  };

  if (!storage.user) {
    return null;
  }

  return (
    <>
      <form>
        <h1>Select your server</h1>

        <select name="region" value={region} onChange={onRegionChange}>
          <option value="us">Americas and Oceania</option>
          <option value="eu">Europe</option>
        </select>

        <select name="server" value={server} onChange={onServerChange}>
          {serverList}
        </select>

        <select name="faction" value={faction} onChange={onFactionChange}>
          <option value="Alliance">Alliance</option>
          <option value="Horde">Horde</option>
        </select>

        <button type="button" onClick={onSubmit}>Save</button>
      </form>

      {saved && <div id="result">Saved succesfully!</div>}
    </>
  );
};

async function main() {
  await useStore.getState().storage.actions.init();

  ReactDOM.render(
    <Form />,
    document.getElementById('root'),
  );
}

main();
