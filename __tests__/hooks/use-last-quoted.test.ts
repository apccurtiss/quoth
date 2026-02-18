/**
 * Tests for the useLastQuoted hook.
 * Verifies it computes max timestamp per alias from quote data.
 */

import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import type { QuoteList } from '@/types';

// --- Mocks ---

const mockGetQuotesForLists = jest.fn();

jest.mock('@/services/firestore', () => ({
  getQuotesForLists: (...args: unknown[]) => mockGetQuotesForLists(...args),
}));

jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromMillis: (ms: number) => ({
      toMillis: () => ms,
      toDate: () => new Date(ms),
    }),
  },
}));

jest.mock('@/services/firebase', () => ({
  db: 'MOCK_DB',
}));

import { useLastQuoted } from '@/hooks/use-last-quoted';

beforeEach(() => {
  jest.clearAllMocks();
});

function createHookRenderer(
  lists: QuoteList[],
  aliases: Record<string, string>,
  enabled: boolean,
) {
  let result: { current: Record<string, number> } = { current: {} };
  function TestComponent() {
    result.current = useLastQuoted(lists, aliases, enabled);
    return null;
  }
  return { TestComponent, result };
}

const fakeLists: QuoteList[] = [
  { id: 'list1', personName: 'Mike', collaborators: ['u1'], createdBy: 'u1' } as QuoteList,
  { id: 'list2', personName: 'Sarah', collaborators: ['u1'], createdBy: 'u1' } as QuoteList,
];

const fakeAliases: Record<string, string> = {
  list1: 'Mike',
  list2: 'Sarah',
};

describe('useLastQuoted', () => {
  it('returns empty object initially', () => {
    mockGetQuotesForLists.mockResolvedValue([]);
    const { TestComponent, result } = createHookRenderer(fakeLists, fakeAliases, true);
    act(() => { create(createElement(TestComponent)); });
    // Before the async resolves, result is empty
    expect(result.current).toEqual({});
  });

  it('computes max timestamp per alias', async () => {
    mockGetQuotesForLists.mockResolvedValue([
      {
        id: 'q1',
        text: 'a',
        personAlias: 'Mike',
        listId: 'list1',
        createdAt: { toMillis: () => 1000 },
        createdBy: 'u1',
      },
      {
        id: 'q2',
        text: 'b',
        personAlias: 'Mike',
        listId: 'list1',
        createdAt: { toMillis: () => 3000 },
        createdBy: 'u1',
      },
      {
        id: 'q3',
        text: 'c',
        personAlias: 'Sarah',
        listId: 'list2',
        createdAt: { toMillis: () => 2000 },
        createdBy: 'u1',
      },
    ]);

    const { TestComponent, result } = createHookRenderer(fakeLists, fakeAliases, true);

    await act(async () => { create(createElement(TestComponent)); });

    expect(result.current).toEqual({ Mike: 3000, Sarah: 2000 });
  });

  it('does not fetch when disabled', async () => {
    const { TestComponent, result } = createHookRenderer(fakeLists, fakeAliases, false);

    await act(async () => { create(createElement(TestComponent)); });

    expect(mockGetQuotesForLists).not.toHaveBeenCalled();
    expect(result.current).toEqual({});
  });

  it('does not fetch when lists are empty', async () => {
    const { TestComponent, result } = createHookRenderer([], fakeAliases, true);

    await act(async () => { create(createElement(TestComponent)); });

    expect(mockGetQuotesForLists).not.toHaveBeenCalled();
    expect(result.current).toEqual({});
  });

  it('handles fetch failure silently', async () => {
    mockGetQuotesForLists.mockRejectedValue(new Error('network error'));

    const { TestComponent, result } = createHookRenderer(fakeLists, fakeAliases, true);

    // Should not throw
    await act(async () => { create(createElement(TestComponent)); });

    expect(result.current).toEqual({});
  });

  it('skips quotes with no matching alias', async () => {
    mockGetQuotesForLists.mockResolvedValue([
      {
        id: 'q1',
        text: 'a',
        personAlias: 'Unknown',
        listId: 'list999',
        createdAt: { toMillis: () => 5000 },
        createdBy: 'u1',
      },
    ]);

    const { TestComponent, result } = createHookRenderer(fakeLists, fakeAliases, true);

    await act(async () => { create(createElement(TestComponent)); });

    // list999 has no alias mapping, so no entries
    expect(result.current).toEqual({});
  });
});
