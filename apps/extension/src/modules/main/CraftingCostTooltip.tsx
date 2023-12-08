import * as i from 'types';
import * as React from 'react';
import { ELEMENT_ID } from 'src/constants';
import LoadingSvg from 'static/loading.svg';
import { TooltipBody } from './tooltip/TooltipBody';
import { Value } from './tooltip/Value';
import useIsClassicWowhead from 'hooks/useIsClassicWowhead';

type Item = { id: number; amount: number; icon: string };

type Props = {
  items: i.CachedItemDataClassic[] | undefined;
  reagentItems: Item[];
  isLoading?: boolean;
  reagents?: Map<number, number>;
  craftAmount?: number;
};

export const CraftingCostTooltip = ({ craftAmount = 1, ...props }: Props) => {
  const { wowheadBaseUrl } = useIsClassicWowhead();

  function getReagentAmount(id: number) {
    return props.reagentItems.find((reagentItem) => reagentItem.id === id)?.amount ?? 1;
  }

  function getReagentIcon(id: number) {
    return props.reagentItems.find((reagentItem) => reagentItem.id === id)?.icon ?? '';
  }

  const total =
    props.items?.reduce((acc, item) => {
      const reagentAmount = getReagentAmount(item.itemId);
      const { minBuyout } = item.stats.current;
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

          {(!props.items || props.isLoading) && (
            <div className="auc-col-span-3 auc-flex auc-items-center auc-justify-center">
              <LoadingSvg />
            </div>
          )}

          {props.items?.map((item) => (
            <React.Fragment key={item.itemId}>
              <a
                href={`${wowheadBaseUrl}/item=${item.itemId}`}
                className={`auc-flex auc-gap-1 auc-items-center ${getQualityClassFromTags(
                  item.tags,
                )}`}
              >
                <ItemIcon
                  url={getReagentIcon(item.itemId)}
                  itemId={item.itemId}
                  slug={item.uniqueName}
                />
                <span className="auc-flex-1">{item.name}</span>
              </a>
              <div className="auc-flex auc-items-center auc-justify-end">
                {getReagentAmount(item.itemId) * craftAmount}
              </div>
              <div className="auc-flex auc-items-center auc-justify-end">
                <Value
                  value={item.stats.current.minBuyout}
                  amount={getReagentAmount(item.itemId) * craftAmount}
                />
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
  const { wowheadBaseUrl } = useIsClassicWowhead();

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
