import { ClientOnly, Link, createFileRoute } from '@tanstack/react-router';
import { FactionButtons } from 'common/faction-buttons';
import { ItemImage } from 'common/item-image';
import { NotFound } from 'common/not-found';
import { ItemCharts } from 'modules/item-detail/item-charts';
import { getItemDetail } from 'queries/items';
import { getTextQualityColor } from 'services/colors';
import { historyRangeLabels, historyRangeSchema, historyRanges } from 'services/history-range';
import type { HistoryRange } from 'services/history-range';
import { Button } from 'shadcn-ui/button';
import { realmLabel } from 'services/realms';

export const Route = createFileRoute('/item/$realmSlug/$region/$faction/$itemSlug')({
  validateSearch: (search: Record<string, unknown>): { range?: HistoryRange } => {
    const range = historyRangeSchema.parse(search.range);
    return range === '7d' ? {} : { range };
  },
  loaderDeps: ({ search }) => ({ range: search.range ?? '7d' }),
  loader: ({ params, deps }) => getItemDetail({ data: { ...params, range: deps.range } }),
  staleTime: 300_000,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData ? `${loaderData.itemMetadata.name} · Auctionoton` : 'Item · Auctionoton',
      },
    ],
  }),
  notFoundComponent: NotFound,
  component: ItemPage,
});

function ItemPage() {
  const params = Route.useParams();
  const { realmSlug, region, faction } = params;
  const { itemMetadata, itemHistory, archiveUnavailable } = Route.useLoaderData();
  const range = Route.useSearch().range ?? '7d';

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <header className="flex flex-col gap-6">
        <div className="flex gap-2 items-center">
          <ItemImage item={itemMetadata} width={40} height={40} />
          <div className="flex flex-col justify-start">
            <h1 className="font-bold text-2xl" style={getTextQualityColor(itemMetadata.quality)}>
              {itemMetadata.name}
            </h1>
            <p className="text-sm">
              {realmLabel(realmSlug, region)} <span className="capitalize">- {faction}</span>
            </p>
          </div>
        </div>
        <FactionButtons itemParams={params} initialValue={faction} />
      </header>
      <nav aria-label="Chart range" className="flex gap-2">
        {historyRanges.map((option) => (
          <Button key={option} variant={option === range ? 'default' : 'outline'} size="sm" asChild>
            <Link
              to="/item/$realmSlug/$region/$faction/$itemSlug"
              params={params}
              search={option === '7d' ? {} : { range: option }}
              replace
              aria-current={option === range ? 'true' : undefined}
            >
              {historyRangeLabels[option]}
            </Link>
          </Button>
        ))}
      </nav>
      {archiveUnavailable && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Older price history is temporarily unavailable. Showing recent prices only.
        </p>
      )}
      {itemHistory.length > 0 ? (
        <ClientOnly fallback={<p>Loading price charts...</p>}>
          <ItemCharts itemHistory={itemHistory} />
        </ClientOnly>
      ) : (
        <p>No prices in this range for this faction. Try another range, faction or realm.</p>
      )}
    </main>
  );
}
