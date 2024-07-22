import { getRecentSearches } from 'actions/search';

import { RecentSearchItem } from './recent-search-item';

export const RecentSearchSection = async () => {
  const recentSearches = await getRecentSearches();

  return (
    <section className="px-10 space-y-4">
      <h2 className="text-2xl font-bold">Recent Searches</h2>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {recentSearches.map((item) => (
          <RecentSearchItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
};

export const RecentSearchSectionLoader = () => {
  return (
    <section className="px-10 space-y-4">
      <h2 className="text-2xl font-bold">Recent Searches</h2>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        ...
      </div>
    </section>
  );
}
