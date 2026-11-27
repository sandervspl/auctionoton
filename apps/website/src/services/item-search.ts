import {
  type SearchEngine,
  type SearchItem,
  type Synonyms,
  createSearchEngine,
  decodeIndex,
  isSearchableVersion,
} from '@auctionoton/search';
import { getRouteApi } from '@tanstack/react-router';
import * as React from 'react';

import { useSettings } from 'hooks/use-settings';
import { findRealm, versionLabels } from 'services/realms';

type LoadedIndex = { items: SearchItem[]; synonyms: Synonyms; engine: SearchEngine };
// One download and engine per index file for the life of the tab.
const indexes = new Map<string, Promise<LoadedIndex>>();

export function loadSearchIndex(version: string, hash: string) {
  const key = `${version}/${hash}`;
  let loading = indexes.get(key);
  if (!loading) {
    loading = (async () => {
      const response = await fetch(`/search-index/${version}/${hash}`);
      if (!response.ok) throw new Error(`Search index failed to load: ${response.status}`);
      const { items, synonyms } = decodeIndex(await response.json());
      return { items, synonyms, engine: createSearchEngine(items, synonyms) };
    })();
    // A failed download may be retried on the next focus.
    loading.catch(() => indexes.delete(key));
    indexes.set(key, loading);
  }
  return loading;
}

const rootRoute = getRouteApi('__root__');

export type SearchEngineState =
  | { status: 'unsupported'; versionLabel: string }
  | { status: 'unavailable' }
  | { status: 'loading'; load: () => void }
  | { status: 'error'; load: () => void }
  | { status: 'ready'; engine: SearchEngine };

/**
 * The selected Game version's search engine. The index downloads when the browser is idle
 * after page load, or at once when `load` runs, e.g. on focus of a search box.
 */
export function useSearchEngine(): SearchEngineState {
  const { settings } = useSettings();
  const { searchIndexes } = rootRoute.useLoaderData();
  const version = findRealm(settings.realm, settings.region)?.version;
  const hash = version && isSearchableVersion(version) ? searchIndexes[version] : undefined;
  const [loaded, setLoaded] = React.useState<{
    key: string;
    engine?: SearchEngine;
    failed?: boolean;
  }>();
  const key = hash ? `${version}/${hash}` : '';

  const load = React.useCallback(() => {
    if (!hash || !version) return;
    loadSearchIndex(version, hash).then(
      ({ engine }) => setLoaded({ key: `${version}/${hash}`, engine }),
      () => setLoaded({ key: `${version}/${hash}`, failed: true }),
    );
  }, [version, hash]);

  React.useEffect(() => {
    if (!hash) return;
    const idle =
      window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 200));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => load());
    return () => cancel(handle as number);
  }, [hash, load]);

  if (version && !isSearchableVersion(version))
    return { status: 'unsupported', versionLabel: versionLabels[version] };
  if (!hash) return { status: 'unavailable' };
  if (loaded?.key === key && loaded.engine) return { status: 'ready', engine: loaded.engine };
  if (loaded?.key === key && loaded.failed) return { status: 'error', load };
  return { status: 'loading', load };
}
