import { createServerFn } from '@tanstack/react-start';
import { getCloudflareBindings } from 'db/cloudflare.server';
import { getAccessSessionForServerFn } from 'services/access.server';
import { z } from 'zod';

import {
  deleteSynonym,
  listSynonyms,
  rebuildSearchIndexes,
  saveSynonym,
  searchManifest,
} from '../../../cloudflare/src/search-index';

/** The current index hash per Game version; empty until indexes are built or outside D1. */
export const getSearchManifest = createServerFn({ method: 'GET' }).handler(async () => {
  const bindings = await getCloudflareBindings();
  return bindings ? searchManifest(bindings.MARKET) : {};
});

async function requireSearchAdmin() {
  const session = await getAccessSessionForServerFn();
  const admins = (process.env.SEARCH_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!session || !admins.includes(session.email.toLowerCase()))
    throw new Error('Only search admins can manage synonyms');
  const bindings = await getCloudflareBindings();
  if (!bindings) throw new Error('Synonyms need the Cloudflare data backend');
  return bindings;
}

export const getIsSearchAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    await requireSearchAdmin();
    return true;
  } catch {
    return false;
  }
});

export const getSynonyms = createServerFn({ method: 'GET' }).handler(async () => {
  const bindings = await requireSearchAdmin();
  return listSynonyms(bindings.MARKET);
});

const synonymInput = z.object({
  id: z.int().positive().optional(),
  kind: z.enum(['item', 'word']),
  term: z.string().max(200),
  itemIds: z.array(z.int().positive()).max(20).optional(),
  expansion: z.string().max(200).optional(),
});

async function rebuilt(bindings: Awaited<ReturnType<typeof requireSearchAdmin>>) {
  await rebuildSearchIndexes(bindings);
  return {
    synonyms: await listSynonyms(bindings.MARKET),
    manifest: await searchManifest(bindings.MARKET),
  };
}

/** Saves a Synonym and rebuilds the indexes so it reaches players on their next page load. */
export const saveSearchSynonym = createServerFn({ method: 'POST' })
  .validator(synonymInput)
  .handler(async ({ data }) => {
    const bindings = await requireSearchAdmin();
    await saveSynonym(bindings.MARKET, data);
    return rebuilt(bindings);
  });

export const deleteSearchSynonym = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.int().positive() }))
  .handler(async ({ data }) => {
    const bindings = await requireSearchAdmin();
    await deleteSynonym(bindings.MARKET, data.id);
    return rebuilt(bindings);
  });
