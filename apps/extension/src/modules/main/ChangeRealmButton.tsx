import * as React from 'react';

import { useRealm } from '@/hooks/useRealm';

export const ChangeRealmButton: React.FC = () => {
  const { activeRealm } = useRealm();

  return (
    <button
      type="button"
      className="btn btn-small btn !auc-flex auc-items-center"
      onClick={() => window.open(`${chrome.runtime.getURL('popup.html')}?large=true`)}
      title="Change server for Auctionoton"
    >
      {/* @ts-ignore */}
      <img src="~/assets/globe-americas-regular.svg" alt="globe" className="auc-h-3 auc-pr-1" />
      <span>{activeRealm ? 'Change realm' : 'Add your realm!'}</span>
    </button>
  );
};
