import { ReadonlyURLSearchParams } from 'next/navigation';

export const getActiveFaction = (searchParams?: { faction?: string } | ReadonlyURLSearchParams) => {
  const faction =
    searchParams && 'get' in searchParams
      ? searchParams.get('faction')
      : searchParams?.faction || 'alliance';
  return faction;
};
