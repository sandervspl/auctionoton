import { useRealm } from 'hooks/useRealm';
import * as React from 'react';
import GlobeSvg from 'static/globe-americas-regular.svg';

export const ChangeRealmButton: React.FC = () => {
  const { activeRealm } = useRealm();

  return (
    <button
      className="btn btn-small auc-btn !auc-flex auc-items-center"
      onClick={() => window.open(`${addon.runtime.getURL('form.html')}?large=true`)}
      title="Change server for Auctionoton"
    >
      {/* @ts-ignore */}
      <GlobeSvg className="auc-h-3 auc-pr-1" />
      <span>{activeRealm ? 'Change realm' : 'Add your realm!'}</span>
    </button>
  );
};
