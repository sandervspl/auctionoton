import React from 'react';
import ReactDOM from 'react-dom';
import useGetSpellFromPage from 'hooks/useGetSpellFromPage';
import { ELEMENT_ID } from 'src/constants';
import { useItemsFetcher } from 'hooks/useItemsFetcher';
import generateContainer from './generateContainer';
import { TooltipBody } from './tooltip/TooltipBody';
import { Value } from './tooltip/Value';

type Props = unknown;

export const ReagentsTooltip: React.FC<Props> = (props) => {
  const { spell: pageSpell } = useGetSpellFromPage();
  const tooltipElementId = `tt${pageSpell?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);
  const [reagents, setReagents] = React.useState<Map<number, number>>(new Map());
  const container = React.useMemo(
    () => (tooltipElement ? generateContainer(tooltipElement, 'page') : null),
    [tooltipElement],
  );
  const reagentItemIds: number[] = React.useMemo(() => {
    const reagentsHeaderEl = document.querySelector('#icon-list-heading-reagents');
    if (!reagentsHeaderEl) {
      console.error('Could not find reagents header element');
      return [];
    }

    const reagentsTable = reagentsHeaderEl.nextElementSibling;
    if (!reagentsTable) {
      console.error('Could not find reagents table');
      return [];
    }

    // Get all anchors that:
    // - has a href that includes "item="
    // - has a classname that is "q<NUMBER>"
    // - is not in a <tr> that has 'style="display:none"'
    const reagentAnchors = reagentsTable.querySelectorAll<HTMLAnchorElement>(
      'tr:not([style*="display:none"]) a[href*="item="][class^="q"]',
    );

    const reagentItemIds = Array.from(reagentAnchors)
      .map((anchor) => {
        const href = anchor.getAttribute('href');
        if (!href) {
          console.error('Could not find href on reagent anchor');
          return null;
        }

        const match = href.match(/item=(\d+)/);
        if (!match) {
          console.error('Could not find item id in href');
          return null;
        }

        const id = Number(match[1]);

        const amountEl = anchor.nextElementSibling;
        if (amountEl) {
          const amount = amountEl.querySelector('span')?.textContent;

          if (amount) {
            setReagents((map) => {
              map.set(id, Number(amount));
              return map;
            });
          }
        }

        return id;
      })
      .filter((id): id is number => !!id);

    if (reagentAnchors.length === 0) {
      if (__DEV__) {
        console.error('Could not find any reagent anchors');
      }

      return [];
    }

    const uniqueItemIds = new Set(reagentItemIds);

    return Array.from(uniqueItemIds);
  }, []);
  const items = useItemsFetcher(pageSpell?.id, reagentItemIds);

  // If there are no reagents, don't show the tooltip
  if (reagentItemIds.length === 0) {
    return null;
  }

  if (!container) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <div className="auc-h-2" />
      <p className="!auc-relative !auc-left-0 !auc-h-auto !auc-w-auto auc-text-[10px]">
        Auction House Prices for Wowhead
      </p>

      <TooltipBody id={ELEMENT_ID.TOOLTIP} className="!auc-w-full">
        <div
          className="auc-grid auc-mt-2 auc-gap-x-4"
          style={{ gridTemplateColumns: 'auto 30px auto' }}
        >
          <span className="auc-font-bold">Item</span>
          <span className="auc-font-bold auc-text-right">Qty</span>
          <span className="auc-font-bold auc-mb-2 auc-text-right">Min. Buyout</span>

          {items.data?.map((item) => (
            <React.Fragment key={item.itemId}>
              <div
                className={`auc-flex auc-gap-1 auc-items-center ${getQualityClassFromTags(
                  item.tags,
                )}`}
              >
                <ItemIcon url={item.icon} itemId={item.itemId} slug={item.uniqueName} />
                {item.name}
              </div>
              <div className="auc-flex auc-items-center auc-justify-end">
                {reagents.get(item.itemId)}
              </div>
              <div className="auc-flex auc-items-center auc-justify-end">
                <Value value={item.stats.current.minimumBuyout} />
              </div>
            </React.Fragment>
          ))}
        </div>
      </TooltipBody>
    </>,
    container,
  );
};

const ItemIcon = (props: { url: string; itemId: number; slug: string }) => {
  return (
    <div className="iconsmall" data-env="wrath" data-tree="wrath" data-game="wow">
      <ins style={{ backgroundImage: `url(${props.url})` }} />
      <del />
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a
        aria-label="Icon"
        href={`https://www.wowhead.com/wotlk/item=${props.itemId}/${props.slug}`}
      />
      <span className="wh-icon-text" data-type="number">
        20
      </span>
    </div>
  );
};

function getQualityClassFromTags(tags: string | string[]) {
  const map = new Map([
    ['common', 1],
    ['uncommon', 2],
    ['rare', 3],
    ['epic', 4],
    ['legendary', 5],
  ]);
  const tag = (Array.isArray(tags) ? tags : tags.split(','))[0]?.toLowerCase();
  const q = map.get(tag);

  return `q${q}`;
}
