import * as React from 'react';
import { useItemsFetcher } from './useItemsFetcher';

export function useCraftableItemPage(reagentItemIds: number[]) {
  const [craftAmount, setCraftAmount] = React.useState(1);
  const items = useItemsFetcher(reagentItemIds);

  return {
    craftAmount,
    setCraftAmount,
    items,
  };
}
