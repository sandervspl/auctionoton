import * as React from 'react';
import { useItemsFetcher } from './useItemsFetcher';

export function useCraftableItemPage(reagentItemIds: number[]) {
  const id = React.useId();
  const [craftAmount, setCraftAmount] = React.useState(1);
  const items = useItemsFetcher(id, reagentItemIds);

  return {
    craftAmount,
    setCraftAmount,
    items,
  };
}
