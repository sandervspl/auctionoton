/** A searchable word and, for each of its characters, the index of the source character. */
export type Token = { text: string; positions: number[] };

const folded = new Map<string, string>();
// Apostrophes join a word ("Lionheart's" → "lionhearts") instead of splitting it.
const joiners = new Set(["'", '’', 'ʼ', '`']);

function fold(char: string) {
  let value = folded.get(char);
  if (value === undefined) {
    value = char
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    folded.set(char, value);
  }
  return value;
}

/** Splits text into lowercase ASCII words, ignoring punctuation, accents and apostrophes. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let word = '';
  let positions: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (joiners.has(char)) continue;
    const value = fold(char);
    if (value) {
      word += value;
      for (let count = 0; count < value.length; count++) positions.push(index);
    } else if (word) {
      tokens.push({ text: word, positions });
      word = '';
      positions = [];
    }
  }
  if (word) tokens.push({ text: word, positions });
  return tokens;
}

export const words = (text: string) => tokenize(text).map((token) => token.text);

/** The canonical form used to compare whole phrases, such as Synonym terms. */
export const normalizePhrase = (text: string) => words(text).join(' ');

/** The item page slug. The catalog import stores this exact form. */
export const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
