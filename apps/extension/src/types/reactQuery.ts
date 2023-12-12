import * as i from 'types';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';

export type ItemQueryKey = [auctionHouseId: number, itemId: number];

export type ItemRefetchFn = (
  options?: RefetchOptions | undefined,
) => Promise<QueryObserverResult<i.MaybeAnyItem, unknown>>;
