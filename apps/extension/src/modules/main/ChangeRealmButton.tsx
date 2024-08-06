import * as React from 'react';

import { useRealm } from '@/hooks/useRealm';
import { GlobeIcon } from '@/components/icons';

export const ChangeRealmButton: React.FC = () => {
  const { activeRealm } = useRealm();

  return (
    <button
      type="button"
      className="btn btn-small btn !auc-flex auc-items-center"
      onClick={() => window.open(`${chrome.runtime.getURL('popup.html')}?large=true`)}
      title="Change server for Auctionoton"
    >
      <GlobeIcon className="auc-h-3 auc-pr-1" />
      <span>{activeRealm ? 'Change realm' : 'Add your realm!'}</span>
    </button>
  );
};
