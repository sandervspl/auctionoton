import * as i from './_types';
import { getFactionSlug, getQueries, getServerSlug, nexushubToItemResponse } from './_utils';

export const config = {
  runtime: 'experimental-edge',
};

export default async function handler(req: Request) {
  const query = getQueries(req.url);
  const serverSlug = getServerSlug(query.get('server_name')!);
  const factionSlug = getFactionSlug(query.get('faction')!);

  const url = `https://api.nexushub.co/wow-classic/v1/items/${serverSlug}-${factionSlug}/${query.get(
    'id',
  )}`;
  const result = (await (await fetch(url)).json()) as
    | i.NexusHub.ItemsResponse
    | i.NexusHub.ErrorResponse;

  if ('error' in result) {
    const code = result.error ? 500 : 404;
    return new Response(JSON.stringify({ error: 'true', message: result.error }), { status: code });
  }

  const data = nexushubToItemResponse(result, Number(query.get('amount') || 1));
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
