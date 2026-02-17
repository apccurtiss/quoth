import { getUserLists, getUserListAliases, getQuotesForLists } from './firestore';
import type { Quote, QuoteList } from '@/types';

export interface ExportList {
  id: string;
  personName: string;
  alias: string;
  quotes: ExportQuote[];
}

export interface ExportQuote {
  text: string;
  personAlias: string;
  createdAt: string;
  createdBy: string;
}

export interface ExportData {
  exportedAt: string;
  totalQuotes: number;
  totalLists: number;
  lists: ExportList[];
}

interface BuildExportOptions {
  listId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function buildExportData(
  userId: string,
  options?: BuildExportOptions,
): Promise<ExportData> {
  const [allLists, aliases] = await Promise.all([
    getUserLists(userId),
    getUserListAliases(userId),
  ]);

  const listsToExport = options?.listId
    ? allLists.filter((l) => l.id === options.listId)
    : allLists;

  const listIds = listsToExport.map((l) => l.id!);
  let quotes = await getQuotesForLists(listIds);

  if (options?.fromDate) {
    const from = new Date(options.fromDate).getTime();
    quotes = quotes.filter((q) => (q.createdAt?.toMillis?.() ?? 0) >= from);
  }
  if (options?.toDate) {
    const to = new Date(options.toDate).getTime() + 86400000; // end of day
    quotes = quotes.filter((q) => (q.createdAt?.toMillis?.() ?? 0) < to);
  }

  const quotesByList = new Map<string, Quote[]>();
  for (const q of quotes) {
    const arr = quotesByList.get(q.listId) ?? [];
    arr.push(q);
    quotesByList.set(q.listId, arr);
  }

  const exportLists: ExportList[] = listsToExport
    .map((list) => ({
      id: list.id!,
      personName: list.personName,
      alias: aliases[list.id!] ?? list.personName,
      quotes: (quotesByList.get(list.id!) ?? []).map(toExportQuote),
    }))
    .filter((l) => l.quotes.length > 0 || !options?.fromDate);

  const totalQuotes = exportLists.reduce((n, l) => n + l.quotes.length, 0);

  return {
    exportedAt: new Date().toISOString(),
    totalQuotes,
    totalLists: exportLists.length,
    lists: exportLists,
  };
}

function toExportQuote(q: Quote): ExportQuote {
  return {
    text: q.text,
    personAlias: q.personAlias,
    createdAt: q.createdAt?.toDate?.().toISOString() ?? '',
    createdBy: q.createdBy,
  };
}

export function downloadJson(data: ExportData, filename: string): void {
  if (typeof document === 'undefined') return;
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
