import { ClientOnly, createFileRoute } from '@tanstack/react-router';
import { FactionButtons } from 'common/faction-buttons';
import { ItemImage } from 'common/item-image';
import { NotFound } from 'common/not-found';
import { ItemCharts } from 'modules/item-detail/item-charts';
import { getItemDetail } from 'queries/items';
import { getTextQualityColor } from 'services/colors';

export const Route = createFileRoute('/item/$realmSlug/$region/$faction/$itemSlug')({
  loader: ({ params }) => getItemDetail({ data: params }),
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
  const { itemMetadata, itemHistory } = Route.useLoaderData();

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
              <span className="capitalize">{realmSlug.replaceAll('-', ' ')}</span> (
              {region.toUpperCase()}) <span className="capitalize">- {faction}</span>
            </p>
          </div>
        </div>
        <FactionButtons itemParams={params} initialValue={faction} />
      </header>
      {itemHistory.length > 0 ? (
        <ClientOnly fallback={<p>Loading price charts...</p>}>
          <ItemCharts itemHistory={itemHistory} />
        </ClientOnly>
      ) : (
        <p>No recent prices for this faction. Try another faction or realm.</p>
      )}
    </main>
  );
}
