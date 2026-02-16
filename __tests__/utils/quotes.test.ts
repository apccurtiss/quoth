// Mock firebase/firestore before any imports that depend on it
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromMillis: (ms: number) => ({
      toMillis: () => ms,
      toDate: () => new Date(ms),
    }),
  },
}));

import {
  findMatchingListIds,
  groupQuotesByList,
  sortQuotesByDate,
} from '@/utils/quotes';
import type { Quote } from '@/types';
import { Timestamp } from 'firebase/firestore';

function makeQuote(overrides: Partial<Quote> & { listId: string }): Quote {
  return {
    id: 'q-' + Math.random().toString(36).slice(2, 8),
    text: 'test quote',
    personAlias: 'Test',
    createdBy: 'user1',
    createdAt: Timestamp.fromMillis(Date.now()),
    ...overrides,
  };
}

// --- findMatchingListIds ---

describe('findMatchingListIds', () => {
  const aliases: Record<string, string> = {
    list1: 'Mike',
    list2: 'Sarah',
    list3: 'mike', // same person, different casing
    list4: 'John',
  };

  it('returns matching list IDs for an exact alias (case-insensitive)', () => {
    const result = findMatchingListIds(aliases, 'Mike');
    expect(result).toContain('list1');
    expect(result).toContain('list3');
    expect(result).toHaveLength(2);
  });

  it('is case-insensitive', () => {
    expect(findMatchingListIds(aliases, 'MIKE')).toEqual(
      findMatchingListIds(aliases, 'mike'),
    );
    expect(findMatchingListIds(aliases, 'sarah')).toEqual(['list2']);
  });

  it('returns empty array for no match', () => {
    expect(findMatchingListIds(aliases, 'Unknown')).toEqual([]);
  });

  it('returns empty array for empty name', () => {
    expect(findMatchingListIds(aliases, '')).toEqual([]);
  });

  it('returns empty array for empty aliases', () => {
    expect(findMatchingListIds({}, 'Mike')).toEqual([]);
  });

  it('matches a single list', () => {
    expect(findMatchingListIds(aliases, 'John')).toEqual(['list4']);
  });
});

// --- groupQuotesByList ---

describe('groupQuotesByList', () => {
  it('groups quotes by listId', () => {
    const quotes: Quote[] = [
      makeQuote({ listId: 'list1', text: 'q1' }),
      makeQuote({ listId: 'list2', text: 'q2' }),
      makeQuote({ listId: 'list1', text: 'q3' }),
    ];

    const grouped = groupQuotesByList(quotes);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['list1']).toHaveLength(2);
    expect(grouped['list2']).toHaveLength(1);
  });

  it('returns empty object for empty input', () => {
    expect(groupQuotesByList([])).toEqual({});
  });

  it('preserves quote order within each group', () => {
    const quotes: Quote[] = [
      makeQuote({ listId: 'list1', text: 'first' }),
      makeQuote({ listId: 'list1', text: 'second' }),
      makeQuote({ listId: 'list1', text: 'third' }),
    ];

    const grouped = groupQuotesByList(quotes);
    expect(grouped['list1'].map((q) => q.text)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('handles many lists', () => {
    const quotes: Quote[] = Array.from({ length: 50 }, (_, i) =>
      makeQuote({ listId: `list${i % 10}`, text: `quote ${i}` }),
    );

    const grouped = groupQuotesByList(quotes);
    expect(Object.keys(grouped)).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(grouped[`list${i}`]).toHaveLength(5);
    }
  });
});

// --- sortQuotesByDate ---

describe('sortQuotesByDate', () => {
  const now = Date.now();
  const quotes: Quote[] = [
    makeQuote({
      listId: 'l1',
      text: 'oldest',
      createdAt: Timestamp.fromMillis(now - 3000),
    }),
    makeQuote({
      listId: 'l1',
      text: 'newest',
      createdAt: Timestamp.fromMillis(now),
    }),
    makeQuote({
      listId: 'l1',
      text: 'middle',
      createdAt: Timestamp.fromMillis(now - 1000),
    }),
  ];

  it('sorts descending by default (newest first)', () => {
    const sorted = sortQuotesByDate(quotes);
    expect(sorted.map((q) => q.text)).toEqual([
      'newest',
      'middle',
      'oldest',
    ]);
  });

  it('sorts ascending when specified (oldest first)', () => {
    const sorted = sortQuotesByDate(quotes, 'asc');
    expect(sorted.map((q) => q.text)).toEqual([
      'oldest',
      'middle',
      'newest',
    ]);
  });

  it('does not mutate the original array', () => {
    const original = [...quotes];
    sortQuotesByDate(quotes);
    expect(quotes).toEqual(original);
  });

  it('handles empty array', () => {
    expect(sortQuotesByDate([])).toEqual([]);
  });

  it('handles quotes with null timestamps', () => {
    const withNull: Quote[] = [
      makeQuote({
        listId: 'l1',
        text: 'has date',
        createdAt: Timestamp.fromMillis(now),
      }),
      makeQuote({
        listId: 'l1',
        text: 'no date',
        createdAt: null as unknown as Timestamp,
      }),
    ];

    const sorted = sortQuotesByDate(withNull);
    expect(sorted[0].text).toBe('has date');
    expect(sorted[1].text).toBe('no date');
  });
});
