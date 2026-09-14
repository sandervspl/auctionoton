// biome-ignore lint/correctness/noUnusedImports: The fixture uses the classic JSX transform.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ItemsPage from '../../src/modules/main/routes/ItemsPage';
import { CraftingCostTooltip } from '../../src/modules/main/CraftingCostTooltip';

const values = {
  user: {
    region: 'eu',
    version: 'seasonal',
    realms: { seasonal: { name: 'Test', auctionHouseId: 509 } },
    faction: { Test: 'Alliance' },
  },
};
window.browser = {
  storage: {
    local: {
      async get(key) {
        return structuredClone(key === null ? values : { [key]: values[key] });
      },
      async set(next) {
        Object.assign(values, structuredClone(next));
      },
      async remove(keys) {
        for (const key of keys) Reflect.deleteProperty(values, key);
      },
    },
  },
};
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
client.setQueryData(['storage', 'user'], values.user);
const mount = document.createElement('div');
document.body.append(mount);
const root = createRoot(mount);
const rows = () => [...document.querySelectorAll('.listview-row')];
const rowId = (row) =>
  Number(
    row
      .querySelector('a')
      .getAttribute('href')
      .match(/item=(\d+)/)[1],
  );
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const waitFor = async (condition, message) => {
  const deadline = Date.now() + 5000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`Timed out: ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
function list(ids) {
  const node = document.createElement('div');
  node.dataset.template = 'item';
  node.innerHTML = `<button class="listview-reset-sort">Reset</button><table><thead><tr><th>Item</th></tr></thead><tbody>${ids.map((id) => `<tr class="listview-row"><td><a href="/classic/item=${id}">Item ${id}</a></td></tr>`).join('')}</tbody></table>`;
  return node;
}
const render = (reagentItems) =>
  root.render(
    <QueryClientProvider client={client}>
      <ItemsPage />
      {reagentItems && <CraftingCostTooltip auctionHouseId={509} reagentItems={reagentItems} />}
    </QueryClientProvider>,
  );

window.runRenderingChecks = async () => {
  const ids = Array.from({ length: 30 }, (_, i) => 30 - i);
  let host = list(ids);
  document.body.prepend(host);
  render();
  await waitFor(
    () => rows().length === 30 && rows().every((row) => row.dataset.buyoutRaw),
    'prices for all 30 visible rows',
  );
  const cells = new Map(rows().map((row) => [rowId(row), row.lastElementChild]));
  for (const direction of ['asc', 'desc', 'asc']) {
    document.querySelector('#buyout-header a').click();
    await waitFor(() => rowId(rows()[0]) === (direction === 'asc' ? 1 : 30), `sort ${direction}`);
    assert(
      rows().every((row) => row.lastElementChild === cells.get(rowId(row))),
      'Sorting remounted price portals',
    );
    assert(
      rows().every(
        (row, i, all) =>
          i === 0 ||
          (direction === 'asc' ? rowId(all[i - 1]) < rowId(row) : rowId(all[i - 1]) > rowId(row)),
      ),
      'Incorrect row order',
    );
  }
  // The host site can replace its entire list without navigating the document.
  const replacement = list([2, 1]);
  host.replaceWith(replacement);
  host = replacement;
  await waitFor(
    () => host.querySelector('#buyout-header') && rows().every((row) => row.dataset.buyoutRaw),
    'portals after list replacement',
  );
  assert(document.querySelectorAll('#buyout-header').length === 1, 'Duplicate sort header');
  // Pagination can also reuse a row element with a different item href.
  const reused = rows()[0];
  reused.querySelector('a').href = '/classic/item=31';
  await waitFor(() => reused.dataset.buyoutRaw === '3100', 'price after reused row changes item');
  render([
    { id: 1, amount: 2, icon: '' },
    { id: 999, amount: 3, icon: '' },
  ]);
  await waitFor(() => mount.textContent.includes('Unavailable'), 'missing reagent state');
  assert(mount.textContent.includes('Item 999'), 'Missing reagent disappeared');
  assert(mount.textContent.includes('N/A'), 'Missing reagent has no unavailable price');
  root.unmount();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  assert(
    !host.querySelector('#buyout-header') && rows().every((row) => row.children.length === 1),
    'Portals leaked after unmount',
  );
  host.remove();
  client.clear();
  return {
    visibleRows: 30,
    stableSorts: 3,
    replacement: true,
    reusedRow: true,
    missingReagent: true,
    cleanup: true,
  };
};
