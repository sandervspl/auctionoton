import * as i from 'types';
import * as React from 'react';
import { Loader2Icon } from 'lucide-react';

import { ELEMENT_ID } from '@/constants';
import { useWowhead } from '@/hooks/useWowhead';
import { useItemsFetcher } from '@/hooks/useItemsFetcher';

import { TooltipBody } from './tooltip/TooltipBody';
import { Value } from './tooltip/Value';

type Props = {
  reagentItems: i.ReagentItem[];
  auctionHouseId: number;
  reagents?: Map<number, number>;
  craftAmount?: number;
};

export const CraftingCostTooltip = ({ craftAmount = 1, ...props }: Props) => {
  const { wowheadBaseUrl } = useWowhead();
  const reagents = React.useMemo(
    () => [...new Map(props.reagentItems.map((item) => [item.id, item])).values()],
    [props.reagentItems],
  );
  const items = useItemsFetcher(
    reagents.map((item) => item.id),
    props.auctionHouseId,
  );
  const complete = items.length === reagents.length && items.every((item) => !!item.data?.stats);
  const total = complete
    ? items.reduce((sum, item, index) => {
        const buyout = item.data!.stats.current.minBuyout;
        const raw = typeof buyout === 'object' ? buyout.raw : Number(buyout);
        return sum + raw * reagents[index].amount * craftAmount;
      }, 0)
    : undefined;

  return (
    <>
      <TooltipBody
        id={ELEMENT_ID.TOOLTIP}
        className="!auc-w-full"
        header={<div>Crafting cost breakdown</div>}
      >
        <div
          className="auc-grid auc-mt-2 auc-gap-x-4"
          style={{ gridTemplateColumns: 'auto 30px auto' }}
        >
          <span className="auc-font-bold">Item</span>
          <span className="auc-font-bold auc-text-right">Qty</span>
          <span className="auc-font-bold auc-mb-2 auc-text-right">Cost</span>

          {reagents.map((reagent, index) => {
            const query = items[index];
            const item = query?.data;
            return (
              <React.Fragment key={reagent.id}>
                <div className="auc-flex auc-gap-1 auc-items-center">
                  <ItemIcon url={reagent.icon} itemId={reagent.id} />
                  <a
                    href={`${wowheadBaseUrl}/item=${reagent.id}`}
                    className={getQualityClassFromTags(item?.tags?.length ? item.tags : ['common'])}
                  >
                    {item?.name ?? `Item ${reagent.id}`}
                  </a>
                </div>
                <div className="auc-flex auc-items-center auc-justify-end">
                  {reagent.amount * craftAmount}
                </div>
                <div className="auc-flex auc-items-center auc-justify-end">
                  {item?.stats ? (
                    <Value
                      value={item.stats.current.minBuyout}
                      amount={reagent.amount * craftAmount}
                    />
                  ) : query?.isLoading ? (
                    <Loader2Icon size={15} className="auc-animate-spin" />
                  ) : (
                    <span title={query?.error?.message}>N/A</span>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          <div className="auc-col-span-3 auc-h-4" />

          <div className="auc-flex auc-items-center auc-font-bold">Total</div>
          <div />
          <div className="auc-flex auc-justify-end auc-items-center">
            {total !== undefined ? (
              <Value value={total} />
            ) : items.some((item) => item.isLoading) ? (
              'Loading…'
            ) : (
              'Unavailable'
            )}
          </div>
        </div>
      </TooltipBody>
    </>
  );
};

const ItemIcon = (props: { url: string; itemId: number }) => {
  const { wowheadBaseUrl } = useWowhead();

  return (
    <div className="iconsmall" data-env="wrath" data-tree="wrath" data-game="wow">
      <ins style={{ backgroundImage: `url(${props.url})` }} />
      <del />
      {/* biome-ignore lint/a11y/useAnchorContent: Wowhead script will add content */}
      <a aria-label="Icon" href={`${wowheadBaseUrl}/item=${props.itemId}`} />
    </div>
  );
};

function getQualityClassFromTags(tags: string | string[]) {
  const map = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  const tag = (Array.isArray(tags) ? tags : tags.split(','))[0]?.toLowerCase() as keyof typeof map;
  const q = map[tag];

  return `q${q}`;
}
