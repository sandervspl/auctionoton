import {
  type SearchItem,
  type Synonyms,
  createSearchEngine,
  normalizePhrase,
  searchableVersions,
} from '@auctionoton/search';
import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import * as React from 'react';
import { toast } from 'sonner';

import {
  deleteSearchSynonym,
  getIsSearchAdmin,
  getSynonyms,
  saveSearchSynonym,
} from 'actions/item-search';
import { getTextQualityColor } from 'services/colors';
import { loadSearchIndex } from 'services/item-search';
import { versionLabels } from 'services/realms';
import { Button } from 'shadcn-ui/button';
import { Input } from 'shadcn-ui/input';
import { Label } from 'shadcn-ui/label';

import type { SynonymRecord } from '../../../cloudflare/src/search-index';

export const Route = createFileRoute('/admin/synonyms')({
  beforeLoad: async () => {
    if (!(await getIsSearchAdmin())) throw notFound();
  },
  loader: () => getSynonyms(),
  head: () => ({ meta: [{ title: 'Search synonyms · Auctionoton' }] }),
  component: SynonymsPage,
});

const rootRoute = getRouteApi('__root__');
type Draft = { id?: number; kind: 'item' | 'word'; term: string; target: string };
const emptyDraft: Draft = { kind: 'item', term: '', target: '' };
const parseIds = (value: string) =>
  value
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);

function SynonymsPage() {
  const [synonyms, setSynonyms] = React.useState<SynonymRecord[]>(Route.useLoaderData());
  const [manifest, setManifest] = React.useState(rootRoute.useLoaderData().searchIndexes);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const save = useServerFn(saveSearchSynonym);
  const remove = useServerFn(deleteSearchSynonym);

  async function run(
    action: () => Promise<{ synonyms: SynonymRecord[]; manifest: typeof manifest }>,
  ) {
    setSaving(true);
    try {
      const result = await action();
      setSynonyms(result.synonyms);
      setManifest(result.manifest);
      setDraft(emptyDraft);
      toast.success('Saved; players get it on their next page load');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 p-6 sm:p-10 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Search synonyms</h1>
        <p className="text-sm text-muted-foreground">
          An <strong>item synonym</strong> pins items above every other result ("mcp" → Manual Crowd
          Pummeler). A <strong>word synonym</strong> stands in for words in any item name ("pot" →
          "potion"). Saving rebuilds the search indexes.
        </p>
      </div>

      <form
        className="grid gap-4 sm:grid-cols-[8rem_1fr_2fr_auto] items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void run(() =>
            save({
              data: {
                id: draft.id,
                kind: draft.kind,
                term: draft.term,
                ...(draft.kind === 'item'
                  ? { itemIds: parseIds(draft.target) }
                  : { expansion: draft.target }),
              },
            }),
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="synonym-kind">Kind</Label>
          <select
            id="synonym-kind"
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={draft.kind}
            onChange={(event) =>
              setDraft({ ...draft, kind: event.target.value as Draft['kind'], target: '' })
            }
          >
            <option value="item">Item</option>
            <option value="word">Word</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="synonym-term">Term</Label>
          <Input
            id="synonym-term"
            value={draft.term}
            placeholder={draft.kind === 'item' ? 'mcp' : 'pot'}
            onChange={(event) => setDraft({ ...draft, term: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="synonym-target">{draft.kind === 'item' ? 'Item ids' : 'Expansion'}</Label>
          <Input
            id="synonym-target"
            value={draft.target}
            placeholder={draft.kind === 'item' ? '9449, 9450' : 'potion'}
            onChange={(event) => setDraft({ ...draft, target: event.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {draft.id ? 'Update' : 'Add'}
          </Button>
          {draft.id && (
            <Button type="button" variant="ghost" onClick={() => setDraft(emptyDraft)}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <Preview draft={draft} synonyms={synonyms} manifest={manifest} />

      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-2 font-medium">Kind</th>
            <th className="py-2 font-medium">Term</th>
            <th className="py-2 font-medium">Means</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {synonyms.map((synonym) => (
            <tr key={synonym.id} className="border-t border-border">
              <td className="py-2 capitalize">{synonym.kind}</td>
              <td className="py-2 font-medium">{synonym.term}</td>
              <td className="py-2">
                {synonym.kind === 'item' ? synonym.itemIds.join(', ') : synonym.expansion}
              </td>
              <td className="py-2 text-right whitespace-nowrap">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDraft({
                      id: synonym.id,
                      kind: synonym.kind,
                      term: synonym.term,
                      target:
                        synonym.kind === 'item' ? synonym.itemIds.join(', ') : synonym.expansion,
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void run(() => remove({ data: { id: synonym.id } }))}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
          {!synonyms.length && (
            <tr>
              <td colSpan={4} className="py-4 text-muted-foreground">
                No synonyms yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Top results for the draft's term in one Game version, as if the draft were already saved. */
function Preview({
  draft,
  synonyms,
  manifest,
}: {
  draft: Draft;
  synonyms: SynonymRecord[];
  manifest: Partial<Record<string, string>>;
}) {
  const [version, setVersion] = React.useState<string>(searchableVersions[0]);
  const [items, setItems] = React.useState<SearchItem[]>();
  const [query, setQuery] = React.useState('');
  const hash = manifest[version];

  React.useEffect(() => {
    setItems(undefined);
    if (!hash) return;
    let current = true;
    loadSearchIndex(version, hash).then(
      (index) => current && setItems(index.items),
      () => current && toast.error('Could not load the search index'),
    );
    return () => {
      current = false;
    };
  }, [version, hash]);

  const engine = React.useMemo(() => {
    if (!items) return undefined;
    const others = synonyms.filter((synonym) => synonym.id !== draft.id);
    const merged: Synonyms = {
      items: others
        .filter((synonym) => synonym.kind === 'item')
        .map((synonym) => ({ term: synonym.term, itemIds: synonym.itemIds })),
      words: others
        .filter((synonym) => synonym.kind === 'word')
        .map((synonym) => ({ term: synonym.term, expansion: synonym.expansion })),
    };
    if (draft.term && draft.target) {
      if (draft.kind === 'item')
        merged.items.push({ term: draft.term, itemIds: parseIds(draft.target) });
      else merged.words.push({ term: draft.term, expansion: draft.target });
    }
    return createSearchEngine(items, merged);
  }, [items, synonyms, draft]);

  const previewQuery = query || draft.term;
  const unknown =
    draft.kind === 'item' && items ? parseIds(draft.target).filter((id) => !engine?.get(id)) : [];
  const hits = engine && previewQuery ? engine.search(previewQuery) : [];

  return (
    <section className="space-y-3 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="preview-version">Preview in</Label>
          <select
            id="preview-version"
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          >
            {searchableVersions.map((value) => (
              <option key={value} value={value}>
                {versionLabels[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 grow">
          <Label htmlFor="preview-query">Query</Label>
          <Input
            id="preview-query"
            value={query}
            placeholder={draft.term ? normalizePhrase(draft.term) : 'Type a query'}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      {!hash ? (
        <p className="text-sm text-muted-foreground">No index has been built for this version.</p>
      ) : !items ? (
        <p className="text-sm text-muted-foreground">Loading index…</p>
      ) : (
        <>
          {unknown.length > 0 && (
            <p className="text-sm text-yellow-500">
              Not searchable in {versionLabels[version as keyof typeof versionLabels]}:{' '}
              {unknown.join(', ')}
            </p>
          )}
          <ol className="space-y-1 text-sm">
            {hits.map((hit) => (
              <li key={hit.id} className="flex gap-2">
                <span style={getTextQualityColor(hit.quality)}>{hit.name}</span>
                <span className="text-muted-foreground">
                  #{hit.id} · {hit.reason}
                </span>
              </li>
            ))}
            {previewQuery && !hits.length && <li className="text-muted-foreground">No results</li>}
          </ol>
        </>
      )}
    </section>
  );
}
