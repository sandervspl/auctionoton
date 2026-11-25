/**
 * Incremental RFC 4180 parser. Feed decoded text with write() and collect rows from its return
 * value; end() flushes a final row without a trailing newline. Quoted fields may contain commas,
 * doubled quotes and line breaks. Rows longer than maxRowChars are rejected.
 */
export class CsvParser {
  private field = '';
  private row: string[] = [];
  private quoted = false;
  private quoteSeen = false;
  private rowChars = 0;

  constructor(private readonly maxRowChars = 64 * 1024) {}

  write(text: string): string[][] {
    const rows: string[][] = [];
    for (let index = 0; index < text.length; index++) {
      const char = text[index]!;
      if (++this.rowChars > this.maxRowChars) throw new Error('Oversized CSV row');
      if (this.quoted) {
        if (char !== '"') this.field += char;
        else if (text[index + 1] === '"') {
          this.field += '"';
          index++;
        } else if (index + 1 === text.length) {
          // A quote at the end of a chunk may be the first half of an escaped quote.
          this.quoted = false;
          this.quoteSeen = true;
        } else this.quoted = false;
        continue;
      }
      if (this.quoteSeen) {
        this.quoteSeen = false;
        if (char === '"') {
          this.field += '"';
          this.quoted = true;
          continue;
        }
      }
      if (char === '"' && this.field === '') this.quoted = true;
      else if (char === ',') this.endField();
      else if (char === '\n') rows.push(this.endRow());
      else if (char !== '\r') this.field += char;
    }
    return rows;
  }

  end(): string[][] {
    if (this.quoted) throw new Error('Unterminated CSV quote');
    this.quoteSeen = false;
    return this.field !== '' || this.row.length ? [this.endRow()] : [];
  }

  private endField() {
    this.row.push(this.field);
    this.field = '';
  }

  private endRow() {
    this.endField();
    const row = this.row;
    this.row = [];
    this.rowChars = 0;
    return row;
  }
}
