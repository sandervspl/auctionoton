import type { Synonyms } from '../src/index.ts';

/**
 * The result-quality spec for item search, run against the real Era fixture. Each case states
 * what a player typing `query` must see. Add a case whenever a search result surprises someone.
 */
export type GoldenQuery = {
  query: string;
  why: string;
  /** Names that must be the first results, in this order. */
  top?: string[];
  /** The name that must be the tenth result. */
  last?: string;
  /** Names that must appear somewhere in the first ten. */
  includes?: string[];
  /** Names that must not appear in the first ten. */
  excludes?: string[];
  empty?: boolean;
  reason?: 'id' | 'synonym' | 'text';
  /** Highlight ranges of the first result. */
  highlights?: [number, number][];
};

export const goldenSynonyms: Synonyms = {
  items: [
    { term: 'bom', itemIds: [11382] }, // Blood of the Mountain
    { term: 'tf', itemIds: [19019] }, // Thunderfury: binds on pickup, so never in an index
  ],
  words: [
    { term: 'fap', expansion: 'free action potion' },
    { term: 'mp', expansion: 'mana potion' },
    { term: 'dense', expansion: 'heavy' },
  ],
};

export const goldenQueries: GoldenQuery[] = [
  // Prefix on every word
  {
    query: 'bla lot',
    why: 'every word is a prefix',
    top: ['Black Lotus'],
    highlights: [
      [0, 3],
      [6, 9],
    ],
  },
  { query: 'b', why: 'one letter already answers, most listed first', top: ['Black Lotus'] },
  {
    query: 'thorium',
    why: 'base material before crafted goods',
    top: ['Thorium Ore', 'Thorium Bar'],
  },
  { query: 'dark iron', why: 'phrase prefix, then Popularity', top: ['Dark Iron Ore'] },
  { query: 'mana pot', why: 'the item named by the phrase prefix leads', top: ['Mana Potion'] },
  { query: 'major heal', why: 'partial last word', top: ['Major Healing Potion'] },
  { query: 'copper', why: 'whole word beats longer words', top: ['Copper Bar', 'Copper Ore'] },
  { query: 'linen', why: 'most listed whole-word match first', top: ['Linen Cloth'] },
  { query: 'iron', why: 'whole word "Iron" before "Ironweb"', includes: ['Iron Bar', 'Iron Ore'] },
  {
    query: 'pot',
    why: 'an unfinished word ranks by Popularity, not by where it sits in the name',
    top: ['Lesser Healing Potion', 'Minor Mana Potion'],
    excludes: ['Potent Helmet', 'Potent Cape'],
  },
  {
    query: 'th',
    why: 'filler words like "the" only match when complete',
    top: ['Thorium Ore'],
    excludes: ['Blood of the Mountain'],
  },

  // Exact names
  { query: 'Dark Iron Ore', why: 'exact name', top: ['Dark Iron Ore'] },
  { query: 'BLACK LOTUS', why: 'case does not matter', top: ['Black Lotus'] },
  {
    query: 'elixir of the mongoose',
    why: 'exact name with short words',
    top: ['Elixir of the Mongoose'],
  },
  { query: 'silk', why: 'exact word beats prefix', top: ['Silk Cloth'] },

  // Any word order
  { query: 'lotus black', why: 'reversed words', top: ['Black Lotus'] },
  { query: 'flask titans', why: 'skipped filler words', top: ['Flask of the Titans'] },
  { query: 'essence undeath', why: 'skipped "of"', top: ['Essence of Undeath'] },
  { query: 'potion mana major', why: 'fully shuffled', top: ['Major Mana Potion'] },
  {
    query: 'crusader enchant weapon',
    why: 'recipe found by its words in any order',
    top: ['Formula: Enchant Weapon - Crusader'],
  },

  // Typos
  { query: 'balck lotus', why: 'swapped letters', top: ['Black Lotus'] },
  { query: 'lback lotus', why: 'swapped first two letters', top: ['Black Lotus'] },
  { query: 'arcane crytsal', why: 'typo in the second word', top: ['Arcane Crystal'] },
  { query: 'thoruim bar', why: 'typo with a correct second word', top: ['Thorium Bar'] },
  { query: 'arcanit bar', why: 'unfinished word', top: ['Arcanite Bar'] },
  { query: 'runeclth', why: 'missing letter', top: ['Runecloth'] },
  { query: 'dreamfiol', why: 'swapped letters at the end', top: ['Dreamfoil'] },
  { query: 'plagueblom', why: 'missing letter', top: ['Plaguebloom'] },
  {
    query: 'irn',
    why: 'words under four letters get no typo allowance',
    excludes: ['Iron Bar', 'Iron Ore'],
  },
  { query: 'gold', why: 'typo matches never outrank real ones', top: ['Gold Bar', 'Gold Ore'] },

  // Punctuation and possessives
  { query: 'lionhearts helm', why: 'stray possessive s', top: ['Lionheart Helm'] },
  { query: 'crusaders shield', why: 'apostrophe left out', top: ["Crusader's Shield"] },
  { query: 'black-lotus', why: 'hyphen as separator', top: ['Black Lotus'] },
  {
    query: 'craftsmans writ major mana',
    why: 'apostrophe and dash in the name',
    top: ["Craftsman's Writ - Major Mana Potion"],
  },
  {
    query: 'net o matic',
    why: 'hyphenated name typed with spaces',
    top: ['Gnomish Net-o-Matic Projector'],
  },
  { query: 'devilsaur', why: 'material before gear made of it', top: ['Devilsaur Leather'] },

  // Item ids
  { query: '13446', why: 'item id', top: ['Major Healing Potion'], reason: 'id' },
  { query: '999999', why: 'unknown id', empty: true },

  // Synonyms
  {
    query: 'bom',
    why: 'item synonym pinned above text matches',
    top: ['Blood of the Mountain'],
    reason: 'synonym',
  },
  { query: 'bo', why: 'item synonyms match while typing', top: ['Blood of the Mountain'] },
  {
    query: 'tf',
    why: 'item synonym for an item outside the index',
    excludes: ['Thunderfury, Blessed Blade of the Windseeker'],
  },
  { query: 'fap', why: 'word synonym for a whole name', top: ['Free Action Potion'] },
  { query: 'mp', why: 'the exact expansion leads', top: ['Mana Potion'] },
  {
    query: 'greater mp',
    why: 'word synonym combined with a real word',
    top: ['Greater Mana Potion'],
  },
  {
    query: 'dense',
    why: 'direct matches, then word synonym matches, then typos',
    top: ['Dense Stone', 'Dense Sharpening Stone'],
    last: 'Heavy Leather',
    excludes: ['Smoked Desert Dumplings'],
  },

  // Searchable items only
  { query: 'hand of rag', why: 'items bound on pickup are not in the index', empty: true },
];
