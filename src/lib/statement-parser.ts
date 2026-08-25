/**
 * Bank statement file parser — CSV / legacy binary XLS / XLSX, uniformly, via SheetJS. Runs entirely
 * client-side so the existing `POST /banking/statements/import` JSON-lines contract never has to
 * change (see reconciliation.ts's `ImportStatementRequest`). One generic header-synonym detector
 * covers every bank export shape seen so far (a single signed "Amount" + "Credit/debit indicator"
 * column, like I&M's export; or separate "Money Out"/"Money In" columns behind a few metadata rows,
 * like KCB's) plus the plain 4-column template — there is deliberately no per-bank hardcoded profile.
 */

import * as XLSX from 'xlsx';

export interface ParsedStatementLine {
  /** ISO YYYY-MM-DD, matching the existing `ImportStatementRequest.lines[].transaction_date` contract. */
  transaction_date: string;
  description: string;
  /** Signed: positive = money in, negative = money out. */
  amount: number;
  reference: string;
}

export interface ParseResult {
  lines: ParsedStatementLine[];
  /** Non-fatal notices — a row skipped for a bad date, a blank row, etc. Shown in the preview step. */
  warnings: string[];
}

type CanonicalField = 'date' | 'description' | 'amount' | 'money_in' | 'money_out' | 'indicator' | 'reference';

// Longest/most-specific synonym first within each field so overlapping headers (e.g. "Value Date" also
// containing "date") don't win over a more specific header seen earlier in the same row — combined with
// "first matching column wins, left to right" in detectHeader(), this reproduces the natural column order
// of every real export we've seen without needing a per-bank profile.
const FIELD_SYNONYMS: Record<CanonicalField, string[]> = {
  date: ['transaction date', 'book date', 'value date', 'date'],
  description: ['transaction details', 'description', 'narrative'],
  money_in: ['money in', 'credit amount', 'credit'],
  money_out: ['money out', 'debit amount', 'debit'],
  indicator: ['credit/debit indicator', 'dr/cr', 'cr/dr'],
  amount: ['amount'],
  reference: ['bank reference number', 'transaction reference', 'reference', 'check number'],
};

// Fields whose presence, on their own, don't prove a row is a real header (e.g. a stray cell containing
// the word "amount" in a metadata line). A header row must match at least one of these AND at least 2
// fields total.
const STRONG_FIELDS: CanonicalField[] = ['date', 'money_in', 'money_out', 'amount', 'description'];

const MAX_HEADER_SCAN_ROWS = 30;

function normalizeCell(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function matchField(headerCell: string): CanonicalField | null {
  let best: { field: CanonicalField; len: number } | null = null;
  for (const field of Object.keys(FIELD_SYNONYMS) as CanonicalField[]) {
    for (const syn of FIELD_SYNONYMS[field]) {
      if (headerCell.includes(syn) && (!best || syn.length > best.len)) {
        best = { field, len: syn.length };
      }
    }
  }
  return best?.field ?? null;
}

interface HeaderMap {
  rowIndex: number;
  columns: Partial<Record<CanonicalField, number>>;
}

/** Scans the first MAX_HEADER_SCAN_ROWS rows for the one that looks most like a real column header. */
function detectHeader(rows: unknown[][]): HeaderMap | null {
  let best: HeaderMap | null = null;
  let bestScore = 0;
  const scanLimit = Math.min(rows.length, MAX_HEADER_SCAN_ROWS);
  for (let r = 0; r < scanLimit; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const columns: Partial<Record<CanonicalField, number>> = {};
    let strongHits = 0;
    for (let c = 0; c < row.length; c++) {
      const field = matchField(normalizeCell(row[c]));
      if (!field || columns[field] !== undefined) continue; // first match wins, left to right
      columns[field] = c;
      if (STRONG_FIELDS.includes(field)) strongHits++;
    }
    const totalHits = Object.keys(columns).length;
    // Need a date column plus either an amount column or a money-in/out pair to be usable at all.
    const usable = columns.date !== undefined && (columns.amount !== undefined || columns.money_in !== undefined || columns.money_out !== undefined);
    if (usable && strongHits >= 2 && totalHits > bestScore) {
      bestScore = totalHits;
      best = { rowIndex: r, columns };
    }
  }
  return best;
}

/** Parses DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY, or an already-ISO YYYY-MM-DD date into ISO form. */
function parseDate(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // XLSX with cellDates:false can hand back an Excel serial date number as a string.
  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + serial * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function parseAmount(raw: unknown): number {
  const s = String(raw ?? '').trim().replace(/[^0-9.\-]/g, '');
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function isDebitIndicator(raw: unknown): boolean {
  const s = normalizeCell(raw);
  return s.startsWith('d') || s === 'dr'; // "debit"/"dr" vs "credit"/"cr"
}

/** Normalizes a raw sheet (array-of-arrays, header row anywhere in the first 30 rows) into signed lines. */
export function normalizeRows(rows: unknown[][]): ParseResult {
  const warnings: string[] = [];
  const header = detectHeader(rows);
  if (!header) {
    return { lines: [], warnings: ['Could not find a recognizable header row (need at least a date column and an amount/money-in/money-out column).'] };
  }
  const { rowIndex, columns } = header;
  const lines: ParsedStatementLine[] = [];

  for (let r = rowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === undefined || c === null || String(c).trim() === '')) continue;

    const dateRaw = columns.date !== undefined ? row[columns.date] : undefined;
    const date = parseDate(dateRaw);
    const description = columns.description !== undefined ? String(row[columns.description] ?? '').trim() : '';

    let amount = 0;
    if (columns.money_in !== undefined || columns.money_out !== undefined) {
      const moneyIn = columns.money_in !== undefined ? parseAmount(row[columns.money_in]) : 0;
      const moneyOut = columns.money_out !== undefined ? parseAmount(row[columns.money_out]) : 0;
      amount = moneyIn > 0 ? moneyIn : moneyOut > 0 ? -moneyOut : 0;
    } else if (columns.amount !== undefined) {
      const raw = parseAmount(row[columns.amount]);
      const indicator = columns.indicator !== undefined ? row[columns.indicator] : undefined;
      amount = indicator !== undefined ? (isDebitIndicator(indicator) ? -Math.abs(raw) : Math.abs(raw)) : raw;
    }

    if (amount === 0) {
      // A genuine zero-value line doesn't exist in banking — this is a BALANCE B/FWD row or similar.
      continue;
    }
    if (!date) {
      warnings.push(`Row ${r + 1}: skipped — could not parse a date ("${String(dateRaw ?? '')}").`);
      continue;
    }
    if (!description) {
      warnings.push(`Row ${r + 1}: skipped — no description.`);
      continue;
    }

    const reference = columns.reference !== undefined ? String(row[columns.reference] ?? '').trim() : '';
    lines.push({ transaction_date: date, description, amount, reference });
  }

  return { lines, warnings };
}

/** File extension → the `format` field stored on BankStatement for traceability. */
export function detectFormat(fileName: string): 'csv' | 'xls' | 'xlsx' {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'xlsx' || ext === 'xlsm') return 'xlsx';
  if (ext === 'xls') return 'xls';
  return 'csv';
}

/** Reads a File (CSV, legacy binary XLS, or XLSX) and normalizes it to signed statement lines. */
export async function parseStatementFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array', raw: true, cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { lines: [], warnings: ['The file has no sheets.'] };
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  return normalizeRows(rows);
}

/** Builds a downloadable XLSX template (Date, Description, Amount, Reference) with example rows. */
export function buildTemplateWorkbook(): Blob {
  const aoa: (string | number)[][] = [
    ['Date', 'Description', 'Amount', 'Reference'],
    ['2026-01-15', 'Example deposit', 5000, 'FT123456789'],
    ['2026-01-16', 'Example withdrawal', -1200, 'FT987654321'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Statement');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
