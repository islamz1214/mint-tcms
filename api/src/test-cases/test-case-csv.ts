export interface ParsedCsvRow {
  rowNumber: number;
  values: Record<string, string>;
}

const headerAliases: Record<string, string[]> = {
  title: ['title', 'testcasetitle', 'testcase', 'name'],
  description: ['description', 'summary', 'objective'],
  steps: ['steps', 'procedure', 'testprocedure'],
  expectedResult: ['expectedresult', 'expectedresults', 'expected', 'expectedoutcome'],
  status: ['status', 'state'],
  priority: ['priority', 'importance'],
  suite: ['suite', 'testsuite', 'folder', 'section', 'path'],
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      currentCell = '';
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((value) => value.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function resolveHeaderKey(header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const [targetKey, aliases] of Object.entries(headerAliases)) {
    if (aliases.includes(normalized)) {
      return targetKey;
    }
  }
  return null;
}

function decodeEscapedControlChars(value: string): string {
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '\t');
}

function normalizeCellValue(header: string, rawValue: string | undefined): string {
  const value = rawValue?.trim() ?? '';
  if (!value) return '';

  // CSV imports often store multiline fields as escaped sequences (e.g. "line1\\nline2").
  if (header === 'steps' || header === 'description' || header === 'expectedResult') {
    return decodeEscapedControlChars(value);
  }

  return value;
}

export function mapCsvRows(content: string): ParsedCsvRow[] {
  const rows = parseCsv(content);
  if (rows.length === 0) return [];

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((header) => resolveHeaderKey(header));

  return rows.slice(1).map((row, rowIndex) => {
    const values: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      values[header] = normalizeCellValue(header, row[index]);
    });

    return {
      rowNumber: rowIndex + 2,
      values,
    };
  });
}