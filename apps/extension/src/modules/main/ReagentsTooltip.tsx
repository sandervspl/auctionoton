import React from 'react';
import ReactDOM from 'react-dom';

import LoadingSvg from 'static/loading.svg';
import useGetSpellFromPage from 'hooks/useGetSpellFromPage';
import { ELEMENT_ID } from 'src/constants';
import { useItemsFetcher } from 'hooks/useItemsFetcher';
import { convertToGSCv2 } from '@project/utils';
import generateContainer from './generateContainer';
import { TooltipBody } from './tooltip/TooltipBody';
import { Value } from './tooltip/Value';
import { ChangeRealmButton } from './ChangeRealmButton';

type Props = unknown;

export const ReagentsTooltip: React.FC<Props> = (props) => {
  const { spell: pageSpell } = useGetSpellFromPage();
  const tooltipElementId = `tt${pageSpell?.id}`;
  const tooltipElement = document.querySelector(`div#${tooltipElementId}`);
  const [reagents, setReagents] = React.useState<Map<number, number>>(new Map());
  const [amount, setAmount] = React.useState(1);
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

  React.useEffect(() => {
    const amountInputEl = document.querySelector<HTMLInputElement>(
      '#icon-list-heading-reagents input',
    );
    if (!amountInputEl) {
      console.error('Could not find amount input element');
      return;
    }

    function onAmountChange(e: Event) {
      const value = Number((e.target as HTMLInputElement).value);
      setAmount(value);
    }

    amountInputEl.addEventListener('change', onAmountChange);

    return () => {
      amountInputEl.removeEventListener('change', onAmountChange);
    };
  }, []);

  // If there are no reagents, don't show the tooltip
  if (reagentItemIds.length === 0) {
    return null;
  }

  if (!container) {
    return null;
  }

  const total =
    items.data?.reduce((acc, item) => {
      const reagentAmount = reagents.get(item.itemId) ?? 1;
      const { minimumBuyout } = item.stats.current;
      const value = typeof minimumBuyout === 'string' ? Number(minimumBuyout) : minimumBuyout.raw;

      if (isNaN(value)) {
        return acc;
      }

      return acc + value * reagentAmount * amount;
    }, 0) || 0;

  return ReactDOM.createPortal(
    <>
      <div className="auc-h-2" />
      <p className="!auc-relative !auc-left-0 !auc-h-auto !auc-w-auto auc-text-[10px]">
        Auction House Prices for Wowhead
      </p>

      <TooltipBody
        id={ELEMENT_ID.TOOLTIP}
        className="!auc-w-full"
        header={<div>Cost breakdown</div>}
      >
        <div
          className="auc-grid auc-mt-2 auc-gap-x-4"
          style={{ gridTemplateColumns: 'auto 30px auto' }}
        >
          <span className="auc-font-bold">Item</span>
          <span className="auc-font-bold auc-text-right">Qty</span>
          <span className="auc-font-bold auc-mb-2 auc-text-right">Cost</span>

          {(!items.data || items.isLoading) && (
            <div className="auc-col-span-3 auc-flex auc-items-center auc-justify-center">
              <LoadingSvg />
            </div>
          )}

          {items.data?.map((item) => (
            <React.Fragment key={item.itemId}>
              <a
                href={`https://www.wowhead.com/wotlk/item=${item.itemId}/${item.uniqueName}`}
                className={`auc-flex auc-gap-1 auc-items-center ${getQualityClassFromTags(
                  item.tags,
                )}`}
              >
                <ItemIcon url={item.icon} itemId={item.itemId} slug={item.uniqueName} />
                <span className="auc-flex-1">{item.name}</span>
              </a>
              <div className="auc-flex auc-items-center auc-justify-end">
                {(reagents.get(item.itemId) || 1) * amount}
              </div>
              <div className="auc-flex auc-items-center auc-justify-end">
                <Value
                  value={item.stats.current.minimumBuyout}
                  amount={(reagents.get(item.itemId) || 1) * amount}
                />
              </div>
            </React.Fragment>
          ))}

          <div className="auc-col-span-3 auc-h-4" />

          <div className="auc-flex auc-items-center auc-font-bold">Total</div>
          <div />
          <div className="auc-flex auc-justify-end auc-items-center">
            <Value value={convertToGSCv2(total)} />
          </div>
        </div>
      </TooltipBody>

      <div className="auc-h-1" />

      <ChangeRealmButton />
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
