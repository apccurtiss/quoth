import Papa from 'papaparse';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { findMatchingListIds } from '@/utils/quotes';
import { createList } from './firestore';

export interface ParsedQuote {
  person: string;
  text: string;
  date?: Date;
}

export interface ImportResult {
  created: number;
  listsCreated: number;
  errors: string[];
}

function parseDate(raw: string): Date | undefined {
  if (!raw.trim()) return undefined;

  // MM/DD/YYYY
  const slashMatch = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = new Date(+slashMatch[3], +slashMatch[1] - 1, +slashMatch[2]);
    if (!isNaN(d.getTime())) return d;
  }

  // ISO format (YYYY-MM-DD)
  const d = new Date(raw.trim());
  if (!isNaN(d.getTime())) return d;

  return undefined;
}

export function parseQuoteCsv(csvText: string): ParsedQuote[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields ?? [];
  if (!headers.includes('person') || !headers.includes('quote')) {
    throw new Error('CSV must have "person" and "quote" columns');
  }

  const parsed: ParsedQuote[] = [];
  for (const row of result.data) {
    const person = row.person?.trim();
    const text = row.quote?.trim();
    if (!person || !text) continue;

    parsed.push({
      person,
      text,
      date: row.date ? parseDate(row.date) : undefined,
    });
  }

  return parsed;
}

export async function importQuotes(
  parsed: ParsedQuote[],
  userId: string,
  aliases: Record<string, string>,
): Promise<ImportResult> {
  let created = 0;
  let listsCreated = 0;
  const errors: string[] = [];

  // Track newly created lists so we don't create duplicates within a batch
  const newAliases: Record<string, string> = { ...aliases };

  for (const row of parsed) {
    try {
      let matchingIds = findMatchingListIds(newAliases, row.person);

      if (matchingIds.length === 0) {
        const newListId = await createList(row.person, userId);
        newAliases[newListId] = row.person;
        matchingIds = [newListId];
        listsCreated++;
      }

      const listId = matchingIds[0];
      await addDoc(collection(db, 'quotes'), {
        text: row.text,
        personAlias: row.person,
        listId,
        createdAt: row.date ? Timestamp.fromDate(row.date) : serverTimestamp(),
        createdBy: userId,
      });
      created++;
    } catch (err: any) {
      errors.push(`"${row.text.slice(0, 30)}..." - ${err.message}`);
    }
  }

  return { created, listsCreated, errors };
}
