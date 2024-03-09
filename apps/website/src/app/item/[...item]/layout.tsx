import * as React from 'react';

import { ItemSearchInput } from 'common/item-search-input';
import { RealmDropdown } from 'common/realm-dropdown';

type Props = {
  children: React.ReactNode;
  params: Record<string, string>;
};

export default function Layout(props: Props) {
  return (
    <>
      <header className="relative flex justify-between h-16 px-4 border-b shrink-0 md:px-6 gap-4">
        <div className="absolute top-3 w-48 sm:w-full max-w-96 flex-grow flex-shrink">
          <ItemSearchInput />
        </div>
        <div className="ml-auto self-center">
          <RealmDropdown />
        </div>
      </header>
      {props.children}
    </>
  );
}
