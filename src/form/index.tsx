import React from 'react';
import ReactDOM from 'react-dom';

import * as i from '../types';
import useAsyncStorage from '../useAsyncStorage';
import useServerList from './useServerList';


export const Form: React.FC = () => {
  const [user, saveUser] = useAsyncStorage('user');
  const [region, setRegion] = React.useState<i.Regions>('us');
  const [server, setServer] = React.useState('{}');
  const [faction, setFaction] = React.useState<i.Factions>('Alliance');
  const [saved, setSaved] = React.useState(false);
  const serverList = useServerList(region);

  React.useEffect(() => {
    if (!user) {
      return;
    }

    setRegion(user.region);
    setServer(JSON.stringify(user.server));
    setFaction(user.faction);
  }, [user]);

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

    await saveUser({
      user: {
        region,
        server: JSON.parse(server),
        faction,
      },
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

  if (!user) {
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

ReactDOM.render(<Form />, document.getElementById('root'));
