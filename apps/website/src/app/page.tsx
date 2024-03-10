import * as React from 'react';
import type { Metadata } from 'next';

import { ItemSearchInput } from 'common/item-search-input';
import { FactionButtons } from 'common/faction-buttons';

type Props = {
  params: Record<string, string>;
  searchParams: Record<string, string>;
};

export const metadata: Metadata = {
  title: 'Auctionoton',
};

export default function Page(props: Props) {
  return (
    <>
      <h1>Auctionoton</h1>
      <ItemSearchInput />
      <FactionButtons />
    </>
  );
}
