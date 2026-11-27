---
status: accepted
---

# Item search runs in the browser over a runtime-loaded index

The website targets p95 under 50 ms from keystroke to rendered results, with no debounce, and only about 20k English Searchable items exist. A network round trip per keystroke cannot meet that budget reliably, so the browser downloads a compact, content-hashed index of Searchable items and matches locally with a purpose-built ranker (exact, prefix, any-order word prefix, then typo; Popularity breaks ties). The index is loaded at runtime, never bundled, so catalog imports, Realm sweeps and Synonym edits reach users on their next page load without a deploy.

## Considered Options

- **Worker in-memory index**: one edge round trip per keystroke (typically 20–80 ms) misses the p95 target far from a PoP.
- **Hosted engine (Algolia, Typesense, Meilisearch)**: still a round trip, plus vendor cost and lock-in, for a catalog small enough to ship whole.
- **D1 `LIKE` / FTS5**: no typo tolerance or any-order matching, and a round trip per keystroke.
- **Search library (MiniSearch, Orama, FlexSearch)**: document-style BM25 scoring ranks short item names poorly without heavy tuning; tiered ranking is simpler to own and pin down with golden-query tests.

## Consequences

- There is one index per Game version, holding only that version's Searchable items and Popularity; switching to another Game version fetches its index. Adding locales likewise means one index per locale, not a larger shared one.
- Until an index has loaded (or if it fails), the existing server-side search answers with a short debounce. It does not know Game versions or Synonyms, so its results may differ; this is accepted as a brief fallback.
- Ranking quality is specified by the golden-query test file, not by a library's defaults.
