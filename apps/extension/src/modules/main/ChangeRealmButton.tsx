import { useRealm } from 'hooks/useRealm';
import * as React from 'react';
import GlobeSvg from 'static/globe-americas-regular.svg';

export const ChangeRealmButton: React.FC = () => {
  const { activeRealm } = useRealm();

  return (
    <button
      type="button"
      className="btn btn-small btn !flex items-center"
      onClick={() => window.open(`${chrome.runtime.getURL('popup.html')}?large=true`)}
      title="Change server for Auctionoton"
    >
      {/* @ts-ignore */}
      <GlobeSvg className="h-3 pr-1" />
      <span>{activeRealm ? 'Change realm' : 'Add your realm!'}</span>
    </button>
  );
};
