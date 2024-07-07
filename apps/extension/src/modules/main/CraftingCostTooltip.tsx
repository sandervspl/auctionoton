import * as i from 'types';
import * as React from 'react';
import { ELEMENT_ID } from 'src/constants';
import LoadingSvg from 'static/loading.svg';
import { TooltipBody } from './tooltip/TooltipBody';
import { Value } from './tooltip/Value';
import { useWowhead } from 'hooks/useWowhead';

type Props = {
  items: { data: i.CachedItemDataClassic | undefined; isLoading: boolean }[];
  reagentItems: i.ReagentItem[];
  reagents?: Map<number, number>;
  craftAmount?: number;
};

export const CraftingCostTooltip = ({ craftAmount = 1, ...props }: Props) => {
  const { wowheadBaseUrl } = useWowhead();

  function getReagentAmount(id: number) {
    return props.reagentItems.find((reagentItem) => reagentItem.id === id)?.amount ?? 1;
  }

  function getReagentIcon(id: number) {
    return props.reagentItems.find((reagentItem) => reagentItem.id === id)?.icon ?? '';
  }

  const total =
    props.items
      .filter((item) => item.data?.stats)
      .reduce((acc, item) => {
        const reagentAmount = getReagentAmount(item.data!.itemId);
        const { minBuyout } = item.data!.stats.current;
        const value = typeof minBuyout !== 'object' ? Number(minBuyout) : minBuyout.raw;

        if (isNaN(value)) {
          return acc;
        }

        return acc + value * reagentAmount * craftAmount;
      }, 0) || 0;

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

          {props.items.map((item) => (
            <React.Fragment key={item.data!.itemId}>
              <a
                href={`${wowheadBaseUrl}/item=${item.data!.itemId}`}
                className={`auc-flex auc-gap-1 auc-items-center ${getQualityClassFromTags(
                  item.data?.tags?.length ? item.data.tags : ['common'],
                )}`}
              >
                {item.data && (
                  <>
                    <ItemIcon
                      url={getReagentIcon(item.data.itemId)}
                      itemId={item.data.itemId}
                      slug={item.data.uniqueName}
                    />
                    <span className="auc-flex-1">{item.data.name}</span>
                  </>
                )}
              </a>
              <div className="auc-flex auc-items-center auc-justify-end">
                {getReagentAmount(item.data!.itemId) * craftAmount}
              </div>
              <div className="auc-flex auc-items-center auc-justify-end">
                {item.data?.stats ? (
                  <Value
                    value={item.data.stats.current.minBuyout}
                    amount={getReagentAmount(item.data.itemId) * craftAmount}
                  />
                ) : item.isLoading ? (
                  <LoadingSvg style={{ width: '15px' }} />
                ) : (
                  'N/A'
                )}
              </div>
            </React.Fragment>
          ))}

          <div className="auc-col-span-3 auc-h-4" />

          <div className="auc-flex auc-items-center auc-font-bold">Total</div>
          <div />
          <div className="auc-flex auc-justify-end auc-items-center">
            <Value value={total} />
          </div>
        </div>
      </TooltipBody>
    </>
  );
};

const ItemIcon = (props: { url: string; itemId: number; slug: string }) => {
  const { wowheadBaseUrl } = useWowhead();

  return (
    <div className="iconsmall" data-env="wrath" data-tree="wrath" data-game="wow">
      <ins style={{ backgroundImage: `url(${props.url})` }} />
      <del />
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
