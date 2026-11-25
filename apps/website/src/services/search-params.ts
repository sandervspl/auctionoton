export const getActiveFaction = (searchParams?: { faction?: string } | URLSearchParams) => {
  const faction =
    searchParams && 'get' in searchParams
      ? searchParams.get('faction')
      : searchParams?.faction || 'alliance';
  return faction;
};
