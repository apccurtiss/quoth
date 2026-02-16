import {
  createList,
  addQuote,
  getUserLists,
  getQuotesForList,
  getQuotesForLists,
  getList,
  addCollaborator,
  getListAlias,
  getUserListAliases,
  setListAlias,
} from '@/services/firestore';

// --- Mocks ---

const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...args: string[]) => args.join('/')),
  doc: jest.fn((...args: string[]) => args.join('/')),
  query: jest.fn((...args: unknown[]) => ({ _query: args })),
  where: jest.fn((field: string, op: string, value: unknown) => ({
    field,
    op,
    value,
  })),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  arrayUnion: jest.fn((val: unknown) => ({ _arrayUnion: val })),
}));

jest.mock('@/services/firebase', () => ({
  db: 'MOCK_DB',
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// --- createList ---

describe('createList', () => {
  it('creates a list document with correct data', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-list-id' });
    mockSetDoc.mockResolvedValue(undefined);

    const id = await createList('Mike', 'user1');

    expect(id).toBe('new-list-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);

    const [, data] = mockAddDoc.mock.calls[0];
    expect(data).toEqual({
      personName: 'Mike',
      collaborators: ['user1'],
      createdAt: 'SERVER_TIMESTAMP',
      createdBy: 'user1',
    });
  });

  it('creates a listAlias for the creator', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-list-id' });
    mockSetDoc.mockResolvedValue(undefined);

    await createList('Mike', 'user1');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [path, data] = mockSetDoc.mock.calls[0];
    expect(path).toContain('user1');
    expect(path).toContain('listAliases');
    expect(path).toContain('new-list-id');
    expect(data).toEqual({ alias: 'Mike' });
  });
});

// --- addQuote ---

describe('addQuote', () => {
  it('creates a quote document with correct data', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-quote-id' });

    const id = await addQuote('Funny thing', 'Mike', 'list1', 'user1');

    expect(id).toBe('new-quote-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);

    const [, data] = mockAddDoc.mock.calls[0];
    expect(data).toEqual({
      text: 'Funny thing',
      personAlias: 'Mike',
      listId: 'list1',
      createdAt: 'SERVER_TIMESTAMP',
      createdBy: 'user1',
    });
  });
});

// --- getUserLists ---

describe('getUserLists', () => {
  it('queries lists where user is a collaborator', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'list1',
          data: () => ({
            personName: 'Mike',
            collaborators: ['user1'],
            createdBy: 'user1',
          }),
        },
        {
          id: 'list2',
          data: () => ({
            personName: 'Sarah',
            collaborators: ['user1', 'user2'],
            createdBy: 'user2',
          }),
        },
      ],
    });

    const lists = await getUserLists('user1');

    expect(lists).toHaveLength(2);
    expect(lists[0].id).toBe('list1');
    expect(lists[0].personName).toBe('Mike');
    expect(lists[1].id).toBe('list2');
    expect(lists[1].personName).toBe('Sarah');
  });

  it('returns empty array when user has no lists', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    const lists = await getUserLists('user1');
    expect(lists).toEqual([]);
  });
});

// --- getList ---

describe('getList', () => {
  it('returns list data when found', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'list1',
      data: () => ({
        personName: 'Mike',
        collaborators: ['user1'],
        createdBy: 'user1',
      }),
    });

    const list = await getList('list1');
    expect(list).not.toBeNull();
    expect(list!.id).toBe('list1');
    expect(list!.personName).toBe('Mike');
  });

  it('returns null when not found', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    const list = await getList('nonexistent');
    expect(list).toBeNull();
  });
});

// --- addCollaborator ---

describe('addCollaborator', () => {
  it('calls updateDoc with arrayUnion', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    await addCollaborator('list1', 'user2');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockUpdateDoc.mock.calls[0];
    expect(data.collaborators).toEqual({ _arrayUnion: 'user2' });
  });
});

// --- getQuotesForList ---

describe('getQuotesForList', () => {
  it('returns quotes sorted by createdAt descending', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'q1',
          data: () => ({
            text: 'oldest',
            listId: 'list1',
            createdAt: { toMillis: () => 1000 },
            createdBy: 'user1',
          }),
        },
        {
          id: 'q2',
          data: () => ({
            text: 'newest',
            listId: 'list1',
            createdAt: { toMillis: () => 3000 },
            createdBy: 'user1',
          }),
        },
        {
          id: 'q3',
          data: () => ({
            text: 'middle',
            listId: 'list1',
            createdAt: { toMillis: () => 2000 },
            createdBy: 'user1',
          }),
        },
      ],
    });

    const quotes = await getQuotesForList('list1');

    expect(quotes).toHaveLength(3);
    expect(quotes[0].text).toBe('newest');
    expect(quotes[1].text).toBe('middle');
    expect(quotes[2].text).toBe('oldest');
  });

  it('returns empty array for list with no quotes', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    const quotes = await getQuotesForList('list1');
    expect(quotes).toEqual([]);
  });
});

// --- getQuotesForLists ---

describe('getQuotesForLists', () => {
  it('returns empty array for empty listIds', async () => {
    const quotes = await getQuotesForLists([]);
    expect(quotes).toEqual([]);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('fetches and merges quotes from multiple lists', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'q1',
          data: () => ({
            text: 'from list1',
            listId: 'list1',
            createdAt: { toMillis: () => 2000 },
            createdBy: 'user1',
          }),
        },
        {
          id: 'q2',
          data: () => ({
            text: 'from list2',
            listId: 'list2',
            createdAt: { toMillis: () => 1000 },
            createdBy: 'user1',
          }),
        },
      ],
    });

    const quotes = await getQuotesForLists(['list1', 'list2']);

    expect(quotes).toHaveLength(2);
    // Should be sorted desc by createdAt
    expect(quotes[0].text).toBe('from list1');
    expect(quotes[1].text).toBe('from list2');
  });

  it('batches queries for more than 30 listIds', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    const listIds = Array.from({ length: 35 }, (_, i) => `list${i}`);
    await getQuotesForLists(listIds);

    // Should make 2 calls: one for 30, one for 5
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
  });
});

// --- List Alias functions ---

describe('getListAlias', () => {
  it('returns alias when found', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ alias: 'Mike' }),
    });

    const alias = await getListAlias('user1', 'list1');
    expect(alias).toBe('Mike');
  });

  it('returns null when not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const alias = await getListAlias('user1', 'list1');
    expect(alias).toBeNull();
  });
});

describe('getUserListAliases', () => {
  it('returns a map of listId to alias', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'list1', data: () => ({ alias: 'Mike' }) },
        { id: 'list2', data: () => ({ alias: 'Sarah' }) },
      ],
    });

    const aliases = await getUserListAliases('user1');
    expect(aliases).toEqual({ list1: 'Mike', list2: 'Sarah' });
  });
});

describe('setListAlias', () => {
  it('writes alias to the correct path', async () => {
    mockSetDoc.mockResolvedValue(undefined);

    await setListAlias('user1', 'list1', 'Michael');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [path, data] = mockSetDoc.mock.calls[0];
    expect(path).toContain('user1');
    expect(path).toContain('listAliases');
    expect(path).toContain('list1');
    expect(data).toEqual({ alias: 'Michael' });
  });
});
