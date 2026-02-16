import type { Quote } from '@/types';

/**
 * Find all listIds whose alias matches the given name (case-insensitive).
 */
export function findMatchingListIds(
  aliases: Record<string, string>,
  name: string,
): string[] {
  const normalized = name.toLowerCase();
  return Object.entries(aliases)
    .filter(([, alias]) => alias.toLowerCase() === normalized)
    .map(([listId]) => listId);
}

/**
 * Group quotes by their listId.
 * Quotes within each group preserve their original order.
 */
export function groupQuotesByList(
  quotes: Quote[],
): Record<string, Quote[]> {
  const grouped: Record<string, Quote[]> = {};
  for (const q of quotes) {
    if (!grouped[q.listId]) grouped[q.listId] = [];
    grouped[q.listId].push(q);
  }
  return grouped;
}

/**
 * Sort quotes by createdAt timestamp.
 * Returns a new array (does not mutate the input).
 */
export function sortQuotesByDate(
  quotes: Quote[],
  order: 'desc' | 'asc' = 'desc',
): Quote[] {
  return [...quotes].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return order === 'desc' ? bTime - aTime : aTime - bTime;
  });
}
