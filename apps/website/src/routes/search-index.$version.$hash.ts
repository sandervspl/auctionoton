import { createFileRoute } from '@tanstack/react-router';
import { isSearchableVersion } from '@auctionoton/search';
import { getCloudflareBindings } from 'db/cloudflare.server';

import { SEARCH_INDEX_CACHE_CONTROL, searchIndexKey } from '../../../cloudflare/src/search-index';

// Index files are immutable: a rebuild writes a new hash, so browsers may cache each forever.
export const Route = createFileRoute('/search-index/$version/$hash')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const notFound = () =>
          new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
        if (!isSearchableVersion(params.version) || !/^[0-9a-f]{16}$/.test(params.hash))
          return notFound();
        const bindings = await getCloudflareBindings();
        const object = await bindings?.SEARCH_INDEXES.get(
          searchIndexKey(params.version, params.hash),
        );
        if (!object) return notFound();
        return new Response(object.body as ReadableStream, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': SEARCH_INDEX_CACHE_CONTROL,
            ETag: object.httpEtag,
          },
        });
      },
    },
  },
});
