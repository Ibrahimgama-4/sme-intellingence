import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string | number | null>[];
  fileType: 'csv' | 'xlsx';
}

const MAX_ROWS = 50_000; // sane guardrail for browser-side parsing on an SME dataset

export async function parseUploadedFile(file: File): Promise<ParsedFile> {
  const isXlsx = /\.xlsx?$/i.test(file.name);

  if (isXlsx) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('The workbook has no sheets.');
    const sheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(sheet, { defval: null });
    if (json.length === 0) throw new Error('No data rows found in the first sheet.');
    const headers = Object.keys(json[0]!);
    return { headers, rows: json.slice(0, MAX_ROWS), fileType: 'xlsx' };
  }

  const text = await file.text();
  const result = Papa.parse<Record<string, string | number | null>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error('Could not parse this CSV file. Please check the formatting.');
  }
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data.slice(0, MAX_ROWS), fileType: 'csv' };
}
