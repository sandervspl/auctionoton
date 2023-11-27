import useStorageQuery from 'hooks/useStorageQuery';
import * as React from 'react';
import GlobeSvg from 'static/globe-americas-regular.svg';

export const ChangeRealmButton: React.FC = () => {
  const { data: user } = useStorageQuery('user');

  return (
    <button
      className="btn btn-small auc-btn"
      onClick={() => window.open(`${addon.runtime.getURL('form.html')}?large=true`)}
      title="Change server for Auctionoton"
    >
      {/* @ts-ignore */}
      <GlobeSvg className="auc-h-3 auc-pr-1" />
      <span>{!user?.realms?.classic ? 'Add your realm!' : 'Change realm'}</span>
    </button>
  );
};
