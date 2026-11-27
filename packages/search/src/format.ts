import { slugify } from './normalize.ts';

/** Game versions whose items the Blizzard catalog covers; others have no item search. */
export const searchableVersions = [
  'era',
  'hardcore',
  'seasonal',
  'anniversary',
  'forever',
] as const;
export type SearchableVersion = (typeof searchableVersions)[number];
export const isSearchableVersion = (value: string): value is SearchableVersion =>
  (searchableVersions as readonly string[]).includes(value);

export type SearchItem = {
  id: number;
  name: string;
  slug: string;
  /** Blizzard's compact icon name, e.g. `inv_misc_herb_blacklotus`; empty when unknown. */
  icon: string;
  quality: number;
  /** Item subclass, e.g. "Herb" or "Two-Handed Swords". */
  type: string | null;
  popularity: number;
};

export type ItemSynonym = { term: string; itemIds: number[] };
export type WordSynonym = { term: string; expansion: string };
export type Synonyms = { items: ItemSynonym[]; words: WordSynonym[] };

/**
 * One Game version's index as stored and downloaded. Columns instead of objects, ascending
 * delta-encoded ids and a shared type table keep the file small after compression.
 */
export type SearchIndexFile = {
  format: 1;
  version: string;
  builtAt: string;
  idDeltas: number[];
  names: string[];
  qualities: number[];
  icons: string[];
  types: number[];
  typeNames: string[];
  popularity: number[];
  /** Only for items whose slug is not `slugify(name)`. */
  slugs: Record<string, string>;
  synonyms: { items: [string, number[]][]; words: [string, string][] };
};

export function encodeIndex(
  version: string,
  builtAt: string,
  items: SearchItem[],
  synonyms: Synonyms,
): SearchIndexFile {
  const sorted = [...items].sort((a, b) => a.id - b.id);
  const typeNames: string[] = [];
  const typeIndex = new Map<string, number>();
  const slugs: Record<string, string> = {};
  let previous = 0;
  const file: SearchIndexFile = {
    format: 1,
    version,
    builtAt,
    idDeltas: [],
    names: [],
    qualities: [],
    icons: [],
    types: [],
    typeNames,
    popularity: [],
    slugs,
    synonyms: {
      items: synonyms.items.map((synonym) => [synonym.term, synonym.itemIds]),
      words: synonyms.words.map((synonym) => [synonym.term, synonym.expansion]),
    },
  };
  for (const item of sorted) {
    if (item.id <= previous) throw new Error(`Duplicate item ${item.id} in search index`);
    file.idDeltas.push(item.id - previous);
    previous = item.id;
    file.names.push(item.name);
    file.qualities.push(item.quality);
    file.icons.push(item.icon);
    let type = -1;
    if (item.type) {
      type = typeIndex.get(item.type) ?? typeNames.length;
      if (type === typeNames.length) {
        typeNames.push(item.type);
        typeIndex.set(item.type, type);
      }
    }
    file.types.push(type);
    file.popularity.push(item.popularity);
    if (item.slug !== slugify(item.name)) slugs[item.id] = item.slug;
  }
  return file;
}

export function decodeIndex(file: SearchIndexFile): { items: SearchItem[]; synonyms: Synonyms } {
  if (file.format !== 1) throw new Error(`Unsupported search index format ${file.format}`);
  const items: SearchItem[] = [];
  let id = 0;
  for (let index = 0; index < file.idDeltas.length; index++) {
    id += file.idDeltas[index]!;
    const name = file.names[index]!;
    const type = file.types[index]!;
    items.push({
      id,
      name,
      slug: file.slugs[id] ?? slugify(name),
      icon: file.icons[index] ?? '',
      quality: file.qualities[index] ?? 1,
      type: type >= 0 ? (file.typeNames[type] ?? null) : null,
      popularity: file.popularity[index] ?? 0,
    });
  }
  return {
    items,
    synonyms: {
      items: file.synonyms.items.map(([term, itemIds]) => ({ term, itemIds })),
      words: file.synonyms.words.map(([term, expansion]) => ({ term, expansion })),
    },
  };
}
