import * as i from './_types';
import { getFactionSlug, getQueries, getServerSlug } from './_utils';

export const config = {
  runtime: 'experimental-edge',
};

export default async function handler(req: Request) {
  const query = getQueries(req.url);
  const serverSlug = getServerSlug(query.get('server_name')!);
  const factionSlug = getFactionSlug(query.get('faction')!);

  // Query is in the form of id:amount i.e. list=123:1,456:20,987:5
  const listItems = query.get('list')!.split(',');

  const results = await Promise.all(
    listItems.map((listItem) => {
      return new Promise<i.ItemResponse>(async (resolve, reject) => {
        const [id, amount = '1'] = listItem.split(':');

        // Fetch from own API so can we can hit cache
        const queries = new URLSearchParams();
        queries.set('id', id);
        queries.set('amount', amount);
        queries.set('server_name', serverSlug);
        queries.set('faction', factionSlug);
        const url = req.url.split('/api')[0] + '/api/item?' + queries;
        try {
          const result = await (await fetch(url)).json();

          return resolve(result);
        } catch (err) {
          console.error(err);
          reject();
        }
      });
    }),
  );

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'cache-control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
