import type { SearchItem, Synonyms } from './format.ts';
import { normalizePhrase, tokenize, words } from './normalize.ts';

export type MatchReason = 'id' | 'synonym' | 'text';
export type SearchHit = SearchItem & {
  /** Half-open character ranges of `name` that matched the query. */
  highlights: [number, number][];
  reason: MatchReason;
};
export type SearchEngine = {
  readonly items: readonly SearchItem[];
  get(id: number): SearchItem | undefined;
  search(query: string, limit?: number): SearchHit[];
};

// How one query word matched one item word; lower is better.
const EXACT = 0;
const PREFIX = 1;
const SYNONYM = 2;
const TYPO = 3;
type WordMatch = {
  kind: number;
  typos: number;
  /** The item word that matched, and how many of its characters to highlight. */
  word: string;
  length: number;
  /** The expansion words a word synonym stood in for. */
  via?: string[];
};

// Algolia's defaults: one typo from 4 characters, two from 8.
const typoBudget = (length: number) => (length >= 8 ? 2 : length >= 4 ? 1 : 0);

let rows = [new Int32Array(64), new Int32Array(64), new Int32Array(64)];
/**
 * Optimal string alignment distance between `query` and the closest prefix of `word`,
 * or `max + 1` once it is certain to exceed `max`.
 */
export function prefixDistance(query: string, word: string, max: number) {
  const n = query.length;
  const m = Math.min(word.length, n + max);
  if (m + 1 > rows[0]!.length)
    rows = [new Int32Array(m + 1), new Int32Array(m + 1), new Int32Array(m + 1)];
  let [before, previous, current] = rows as [Int32Array, Int32Array, Int32Array];
  for (let j = 0; j <= m; j++) previous[j] = j;
  for (let i = 1; i <= n; i++) {
    current[0] = i;
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      const cost = query[i - 1] === word[j - 1] ? 0 : 1;
      let value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      if (
        i > 1 &&
        j > 1 &&
        query[i - 1] === word[j - 2] &&
        query[i - 2] === word[j - 1] &&
        before[j - 2]! + 1 < value
      )
        value = before[j - 2]! + 1;
      current[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    [before, previous, current] = [previous, current, before];
  }
  let best = max + 1;
  for (let j = 0; j <= m; j++) if (previous[j]! < best) best = previous[j]!;
  return best;
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function lowerBound(sorted: string[], value: string) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (sorted[middle]! < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function createSearchEngine(items: SearchItem[], synonyms: Synonyms): SearchEngine {
  const phrases: string[] = [];
  const wordCounts: number[] = [];
  const postings = new Map<string, number[]>();
  const byId = new Map<number, number>();
  items.forEach((item, index) => {
    byId.set(item.id, index);
    const itemWords = words(item.name);
    phrases.push(itemWords.join(' '));
    wordCounts.push(itemWords.length);
    for (const word of new Set(itemWords)) {
      const list = postings.get(word);
      if (list) list.push(index);
      else postings.set(word, [index]);
    }
  });
  const vocabulary = [...postings.keys()].sort();
  const byFirstChar = new Map<string, string[]>();
  for (const word of vocabulary) {
    const bucket = byFirstChar.get(word[0]!);
    if (bucket) bucket.push(word);
    else byFirstChar.set(word[0]!, [word]);
  }

  const itemSynonyms = synonyms.items
    .map((synonym) => ({
      term: normalizePhrase(synonym.term),
      indexes: synonym.itemIds.flatMap((id) => {
        const index = byId.get(id);
        return index === undefined ? [] : [index];
      }),
    }))
    .filter((synonym) => synonym.term && synonym.indexes.length);
  const wordSynonyms = new Map<string, string[][]>();
  for (const synonym of synonyms.words) {
    const term = words(synonym.term);
    const expansion = words(synonym.expansion);
    // A word synonym replaces one query word; multi-word terms are item synonyms.
    if (term.length !== 1 || !expansion.length) continue;
    wordSynonyms.set(term[0]!, [...(wordSynonyms.get(term[0]!) ?? []), expansion]);
  }

  /** Items containing `word` exactly or as a word prefix. */
  function prefixItems(word: string, visit: (index: number, match: string) => void) {
    for (let i = lowerBound(vocabulary, word); i < vocabulary.length; i++) {
      const candidate = vocabulary[i]!;
      if (!candidate.startsWith(word)) break;
      for (const index of postings.get(candidate)!) visit(index, candidate);
    }
  }

  function matchWord(query: string) {
    const result = new Map<number, WordMatch>();
    const add = (word: string, match: WordMatch) => {
      for (const index of postings.get(word) ?? []) {
        const current = result.get(index);
        if (
          !current ||
          match.kind < current.kind ||
          (match.kind === current.kind && match.typos < current.typos)
        )
          result.set(index, match);
      }
    };
    for (let i = lowerBound(vocabulary, query); i < vocabulary.length; i++) {
      const word = vocabulary[i]!;
      if (!word.startsWith(query)) break;
      add(word, {
        kind: word === query ? EXACT : PREFIX,
        typos: 0,
        word,
        length: query.length,
      });
    }
    // Plurals and possessives: "lionhearts" also finds "Lionheart".
    if (query.length >= 4 && query.endsWith('s')) {
      const singular = query.slice(0, -1);
      add(singular, { kind: PREFIX, typos: 0, word: singular, length: singular.length });
    }
    for (const expansion of wordSynonyms.get(query) ?? []) {
      let matched: Set<number> | undefined;
      for (const word of expansion) {
        const found = new Set<number>();
        prefixItems(word, (index) => {
          if (!matched || matched.has(index)) found.add(index);
        });
        matched = found;
      }
      const match: WordMatch = { kind: SYNONYM, typos: 0, word: '', length: 0, via: expansion };
      for (const index of matched ?? []) {
        const current = result.get(index);
        if (!current || current.kind > SYNONYM) result.set(index, match);
      }
    }
    const max = typoBudget(query.length);
    if (max) {
      const candidates = [
        ...(byFirstChar.get(query[0]!) ?? []),
        // A swap of the first two letters is the only typo allowed in the first letter.
        ...(byFirstChar.get(query[1]!) ?? []).filter((word) => word[1] === query[0]),
      ];
      for (const word of candidates) {
        if (word.length < query.length - max || word.startsWith(query)) continue;
        const typos = prefixDistance(query, word, max);
        if (typos >= 1 && typos <= max)
          add(word, {
            kind: TYPO,
            typos,
            word,
            length: Math.min(query.length, word.length),
          });
      }
    }
    return result;
  }

  function highlights(name: string, matches: WordMatch[]): [number, number][] {
    const tokens = tokenize(name);
    const ranges: [number, number][] = [];
    const mark = (token: (typeof tokens)[number], length: number) => {
      const end = token.positions[Math.min(length, token.positions.length) - 1]!;
      ranges.push([token.positions[0]!, end + 1]);
    };
    for (const match of matches) {
      if (match.via) {
        for (const word of match.via)
          for (const token of tokens) if (token.text.startsWith(word)) mark(token, word.length);
        continue;
      }
      // The earliest word with the same matched prefix: "b" marks Bronze in "Bronze Bar".
      const prefix = match.word.slice(0, match.length);
      const token = tokens.find((candidate) => candidate.text.startsWith(prefix));
      if (token) mark(token, match.length);
    }
    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged: [number, number][] = [];
    for (const range of ranges) {
      const last = merged[merged.length - 1];
      if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
      else merged.push([...range]);
    }
    return merged;
  }

  function search(query: string, limit = 10): SearchHit[] {
    const queryWords = words(query);
    if (!queryWords.length || limit <= 0) return [];
    const phrase = queryWords.join(' ');
    const hits: SearchHit[] = [];
    const seen = new Set<number>();
    const pin = (index: number, reason: MatchReason) => {
      if (seen.has(index) || hits.length >= limit) return;
      seen.add(index);
      hits.push({ ...items[index]!, highlights: [], reason });
    };

    if (queryWords.length === 1 && /^\d+$/.test(phrase)) {
      const index = byId.get(Number(phrase));
      if (index !== undefined) pin(index, 'id');
    }
    const synonymHits = itemSynonyms
      .filter(
        (synonym) =>
          synonym.term === phrase || (phrase.length >= 2 && synonym.term.startsWith(phrase)),
      )
      .sort(
        (a, b) =>
          Number(b.term === phrase) - Number(a.term === phrase) || a.term.length - b.term.length,
      );
    for (const synonym of synonymHits) for (const index of synonym.indexes) pin(index, 'synonym');

    const expandedPhrases = queryWords.flatMap((word, position) =>
      (wordSynonyms.get(word) ?? []).map((expansion) =>
        [...queryWords.slice(0, position), ...expansion, ...queryWords.slice(position + 1)].join(
          ' ',
        ),
      ),
    );
    const perWord = queryWords.map(matchWord).sort((a, b) => a.size - b.size);
    const [smallest, ...rest] = perWord as [Map<number, WordMatch>, ...Map<number, WordMatch>[]];
    const scored: {
      index: number;
      tier: number;
      typos: number;
      exact: number;
    }[] = [];
    for (const index of smallest.keys()) {
      if (seen.has(index) || !rest.every((matches) => matches.has(index))) continue;
      let typos = 0;
      let exact = 0;
      let synonym = false;
      for (const matches of perWord) {
        const match = matches.get(index)!;
        typos += match.typos;
        if (match.kind === EXACT) exact++;
        if (match.kind === SYNONYM) synonym = true;
      }
      const itemPhrase = phrases[index]!;
      let tier: number;
      if (itemPhrase === phrase) tier = 0;
      else if (itemPhrase.startsWith(phrase)) tier = 1;
      else if (typos) tier = 5;
      else if (!synonym) tier = 2;
      // "mp" reads as "mana potion": the item named exactly that leads the synonym matches.
      else tier = expandedPhrases.some((expanded) => itemPhrase.startsWith(expanded)) ? 3 : 4;
      scored.push({ index, tier, typos, exact });
    }
    scored.sort(
      (a, b) =>
        a.tier - b.tier ||
        a.typos - b.typos ||
        b.exact - a.exact ||
        items[b.index]!.popularity - items[a.index]!.popularity ||
        wordCounts[a.index]! - wordCounts[b.index]! ||
        items[a.index]!.name.length - items[b.index]!.name.length ||
        compareText(items[a.index]!.name, items[b.index]!.name) ||
        items[a.index]!.id - items[b.index]!.id,
    );
    for (const { index } of scored) {
      if (hits.length >= limit) break;
      const item = items[index]!;
      hits.push({
        ...item,
        highlights: highlights(
          item.name,
          perWord.map((matches) => matches.get(index)!),
        ),
        reason: 'text',
      });
    }
    return hits;
  }

  return {
    items,
    get: (id) => {
      const index = byId.get(id);
      return index === undefined ? undefined : items[index];
    },
    search,
  };
}
