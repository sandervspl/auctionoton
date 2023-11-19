import * as i from 'types';
import { QueryFunctionContext, QueryObserverResult, RefetchOptions } from 'react-query';

export type ItemQueryKey = [
  string,
  {
    itemId: number;
    server: string;
    faction: i.Factions;
    version: string;
    region: string;
  },
];

export type ItemQueryKeyCtx = QueryFunctionContext<ItemQueryKey, unknown>;

export type ItemRefetchFn = (
  options?: RefetchOptions | undefined,
) => Promise<QueryObserverResult<i.MaybeAnyItem, unknown>>;
