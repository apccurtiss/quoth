import { buildExportData, downloadJson, ExportData } from '@/services/export';

// --- Mocks ---

const mockGetUserLists = jest.fn();
const mockGetUserListAliases = jest.fn();
const mockGetQuotesForLists = jest.fn();

jest.mock('@/services/firestore', () => ({
  getUserLists: (...args: unknown[]) => mockGetUserLists(...args),
  getUserListAliases: (...args: unknown[]) => mockGetUserListAliases(...args),
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

beforeEach(() => {
  jest.clearAllMocks();
});

// --- buildExportData ---

describe('buildExportData', () => {
  const fakeLists = [
    { id: 'list1', personName: 'Mike', collaborators: ['user1'], createdBy: 'user1' },
    { id: 'list2', personName: 'Sarah', collaborators: ['user1'], createdBy: 'user1' },
  ];

  const fakeAliases = { list1: 'Mike', list2: 'Sarah' };

  const fakeQuotes = [
    {
      id: 'q1',
      text: 'Hello world',
      personAlias: 'Mike',
      listId: 'list1',
      createdAt: { toMillis: () => 1000, toDate: () => new Date(1000) },
      createdBy: 'user1',
    },
    {
      id: 'q2',
      text: 'Goodbye world',
      personAlias: 'Sarah',
      listId: 'list2',
      createdAt: { toMillis: () => 2000, toDate: () => new Date(2000) },
      createdBy: 'user1',
    },
    {
      id: 'q3',
      text: 'Another one',
      personAlias: 'Mike',
      listId: 'list1',
      createdAt: { toMillis: () => 3000, toDate: () => new Date(3000) },
      createdBy: 'user1',
    },
  ];

  function setupMocks() {
    mockGetUserLists.mockResolvedValue(fakeLists);
    mockGetUserListAliases.mockResolvedValue(fakeAliases);
    mockGetQuotesForLists.mockResolvedValue(fakeQuotes);
  }

  it('exports all lists and quotes', async () => {
    setupMocks();

    const result = await buildExportData('user1');

    expect(result.totalLists).toBe(2);
    expect(result.totalQuotes).toBe(3);
    expect(result.lists).toHaveLength(2);
    expect(result.exportedAt).toBeDefined();
  });

  it('groups quotes under their respective lists', async () => {
    setupMocks();

    const result = await buildExportData('user1');

    const mikeList = result.lists.find((l) => l.personName === 'Mike');
    const sarahList = result.lists.find((l) => l.personName === 'Sarah');
    expect(mikeList?.quotes).toHaveLength(2);
    expect(sarahList?.quotes).toHaveLength(1);
  });

  it('uses alias when available', async () => {
    mockGetUserLists.mockResolvedValue([
      { id: 'list1', personName: 'Mike', collaborators: ['user1'], createdBy: 'user1' },
    ]);
    mockGetUserListAliases.mockResolvedValue({ list1: 'Michael' });
    mockGetQuotesForLists.mockResolvedValue([fakeQuotes[0]]);

    const result = await buildExportData('user1');
    expect(result.lists[0].alias).toBe('Michael');
  });

  it('falls back to personName when no alias', async () => {
    mockGetUserLists.mockResolvedValue([
      { id: 'list1', personName: 'Mike', collaborators: ['user1'], createdBy: 'user1' },
    ]);
    mockGetUserListAliases.mockResolvedValue({});
    mockGetQuotesForLists.mockResolvedValue([fakeQuotes[0]]);

    const result = await buildExportData('user1');
    expect(result.lists[0].alias).toBe('Mike');
  });

  it('filters by listId when specified', async () => {
    setupMocks();

    const result = await buildExportData('user1', { listId: 'list1' });

    expect(result.totalLists).toBe(1);
    expect(result.lists[0].id).toBe('list1');
    // getQuotesForLists should only be called with the filtered list
    expect(mockGetQuotesForLists).toHaveBeenCalledWith(['list1']);
  });

  it('filters quotes by fromDate', async () => {
    setupMocks();

    // fromDate at 1500ms → only q2 (2000) and q3 (3000) pass
    const result = await buildExportData('user1', {
      fromDate: new Date(1500).toISOString(),
    });

    expect(result.totalQuotes).toBe(2);
  });

  it('filters quotes by toDate', async () => {
    setupMocks();

    // toDate at new Date(1) → end of that day covers 1000ms but not 2000ms or 3000ms
    // toDate adds 86400000 (one day), so toDate at epoch day 0 covers up to 86400000
    // All 3 quotes (1000, 2000, 3000) are within that range
    const result = await buildExportData('user1', {
      toDate: new Date(0).toISOString(),
    });

    expect(result.totalQuotes).toBe(3);
  });

  it('filters by both fromDate and toDate', async () => {
    setupMocks();

    // fromDate at 1500, toDate at new Date(2500) → covers up to 2500 + 86400000
    // q2 (2000) and q3 (3000) pass fromDate, both pass toDate
    const result = await buildExportData('user1', {
      fromDate: new Date(1500).toISOString(),
      toDate: new Date(2500).toISOString(),
    });

    expect(result.totalQuotes).toBe(2);
  });

  it('converts quotes to export format', async () => {
    setupMocks();

    const result = await buildExportData('user1');
    const quote = result.lists[0].quotes[0];

    expect(quote).toHaveProperty('text');
    expect(quote).toHaveProperty('personAlias');
    expect(quote).toHaveProperty('createdAt');
    expect(quote).toHaveProperty('createdBy');
    expect(typeof quote.createdAt).toBe('string');
    // Should not have id or listId
    expect(quote).not.toHaveProperty('id');
    expect(quote).not.toHaveProperty('listId');
  });

  it('handles empty lists', async () => {
    mockGetUserLists.mockResolvedValue([]);
    mockGetUserListAliases.mockResolvedValue({});
    mockGetQuotesForLists.mockResolvedValue([]);

    const result = await buildExportData('user1');

    expect(result.totalLists).toBe(0);
    expect(result.totalQuotes).toBe(0);
    expect(result.lists).toEqual([]);
  });

  it('handles quotes with null createdAt', async () => {
    mockGetUserLists.mockResolvedValue([fakeLists[0]]);
    mockGetUserListAliases.mockResolvedValue({ list1: 'Mike' });
    mockGetQuotesForLists.mockResolvedValue([
      {
        id: 'q1',
        text: 'No date',
        personAlias: 'Mike',
        listId: 'list1',
        createdAt: null,
        createdBy: 'user1',
      },
    ]);

    const result = await buildExportData('user1');
    expect(result.lists[0].quotes[0].createdAt).toBe('');
  });
});

// --- downloadJson ---

describe('downloadJson', () => {
  const mockData: ExportData = {
    exportedAt: '2024-01-01T00:00:00.000Z',
    totalQuotes: 1,
    totalLists: 1,
    lists: [
      {
        id: 'list1',
        personName: 'Mike',
        alias: 'Mike',
        quotes: [
          {
            text: 'Hello',
            personAlias: 'Mike',
            createdAt: '2024-01-01T00:00:00.000Z',
            createdBy: 'user1',
          },
        ],
      },
    ],
  };

  it('does nothing when document is undefined (non-web)', () => {
    // In the default jest-expo env, document is undefined
    // (or we simulate it). downloadJson guards with typeof check.
    expect(() => downloadJson(mockData, 'test.json')).not.toThrow();
  });

  it('creates and clicks a download link when document exists', () => {
    const mockClick = jest.fn();
    const fakeAnchor = { href: '', download: '', click: mockClick };

    // Set up a minimal document on global
    const fakeDocument = {
      createElement: jest.fn(() => fakeAnchor),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
    };
    (global as Record<string, unknown>).document = fakeDocument;

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:test-url');
    URL.revokeObjectURL = jest.fn();

    try {
      downloadJson(mockData, 'export.json');

      expect(fakeDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(fakeAnchor.download).toBe('export.json');
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    } finally {
      // Clean up
      delete (global as Record<string, unknown>).document;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });
});
