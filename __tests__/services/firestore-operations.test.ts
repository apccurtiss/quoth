/**
 * Tests for Firestore collaboration operations:
 * leaveList, mergeLists, removeCollaborator, deleteList, deleteListAlias
 */

import {
  leaveList,
  mergeLists,
  removeCollaborator,
  deleteList,
  deleteListAlias,
} from '@/services/firestore';

// --- Mocks ---

const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();

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
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  arrayUnion: jest.fn((val: unknown) => ({ _arrayUnion: val })),
  arrayRemove: jest.fn((val: unknown) => ({ _arrayRemove: val })),
}));

jest.mock('@/services/firebase', () => ({
  db: 'MOCK_DB',
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// --- removeCollaborator ---

describe('removeCollaborator', () => {
  it('calls updateDoc with arrayRemove', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    await removeCollaborator('list1', 'user2');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockUpdateDoc.mock.calls[0];
    expect(data.collaborators).toEqual({ _arrayRemove: 'user2' });
  });
});

// --- deleteList ---

describe('deleteList', () => {
  it('calls deleteDoc on the list path', async () => {
    mockDeleteDoc.mockResolvedValue(undefined);

    await deleteList('list1');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    const [path] = mockDeleteDoc.mock.calls[0];
    expect(path).toContain('lists');
    expect(path).toContain('list1');
  });
});

// --- deleteListAlias ---

describe('deleteListAlias', () => {
  it('calls deleteDoc on the alias path', async () => {
    mockDeleteDoc.mockResolvedValue(undefined);

    await deleteListAlias('user1', 'list1');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    const [path] = mockDeleteDoc.mock.calls[0];
    expect(path).toContain('user1');
    expect(path).toContain('listAliases');
    expect(path).toContain('list1');
  });
});

// --- leaveList ---

describe('leaveList', () => {
  function setupLeaveListMocks(opts?: { alias?: string | null }) {
    // getList call
    const getDocResponses = [
      // getList(listId)
      {
        exists: () => true,
        id: 'list1',
        data: () => ({
          personName: 'Mike',
          collaborators: ['user1', 'user2'],
          createdBy: 'user2',
        }),
      },
      // getListAlias(userId, listId)
      opts?.alias !== null
        ? {
            exists: () => true,
            data: () => ({ alias: opts?.alias ?? 'Mike' }),
          }
        : { exists: () => false },
    ];
    let getDocCallIndex = 0;
    mockGetDoc.mockImplementation(() =>
      Promise.resolve(getDocResponses[getDocCallIndex++]),
    );

    // getQuotesForList — returns 2 quotes
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'q1',
          data: () => ({
            text: 'Quote 1',
            personAlias: 'Mike',
            listId: 'list1',
            createdAt: { toMillis: () => 2000 },
            createdBy: 'user2',
          }),
        },
        {
          id: 'q2',
          data: () => ({
            text: 'Quote 2',
            personAlias: 'Mike',
            listId: 'list1',
            createdAt: { toMillis: () => 1000 },
            createdBy: 'user1',
          }),
        },
      ],
    });

    // createList returns new list ID
    mockAddDoc.mockResolvedValue({ id: 'new-list-id' });
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  }

  it('creates a new list and copies all quotes', async () => {
    setupLeaveListMocks();

    const newId = await leaveList('list1', 'user1');

    expect(newId).toBe('new-list-id');

    // Should create the new list (addDoc for list + setDoc for alias)
    // Then addDoc for each copied quote (2 quotes)
    // Total addDoc calls: 1 (list) + 2 (quotes) = 3
    expect(mockAddDoc).toHaveBeenCalledTimes(3);
  });

  it('removes user from original list collaborators', async () => {
    setupLeaveListMocks();

    await leaveList('list1', 'user1');

    // Should call updateDoc to remove collaborator
    const removeCall = mockUpdateDoc.mock.calls.find(
      ([, data]: [unknown, Record<string, unknown>]) =>
        (data.collaborators as Record<string, unknown>)?._arrayRemove === 'user1',
    );
    expect(removeCall).toBeDefined();
  });

  it('deletes old alias', async () => {
    setupLeaveListMocks();

    await leaveList('list1', 'user1');

    // deleteDoc should be called for the old alias
    const deleteCall = mockDeleteDoc.mock.calls.find(
      ([path]: [string]) => path.includes('user1') && path.includes('listAliases') && path.includes('list1'),
    );
    expect(deleteCall).toBeDefined();
  });

  it('preserves custom alias on the new list', async () => {
    setupLeaveListMocks({ alias: 'Michael' });

    await leaveList('list1', 'user1');

    // setDoc should be called to set the custom alias on the new list
    const aliasCall = mockSetDoc.mock.calls.find(
      ([path, data]: [string, Record<string, unknown>]) =>
        path.includes('new-list-id') && data.alias === 'Michael',
    );
    expect(aliasCall).toBeDefined();
  });

  it('does not set custom alias if it matches personName', async () => {
    setupLeaveListMocks({ alias: 'Mike' });

    await leaveList('list1', 'user1');

    // setDoc calls: 1 for createList alias. No extra alias call.
    const aliasSetCalls = mockSetDoc.mock.calls.filter(
      ([path]: [string]) => path.includes('new-list-id'),
    );
    // Only the createList call sets an alias on new-list-id
    expect(aliasSetCalls).toHaveLength(1);
    expect(aliasSetCalls[0][1]).toEqual({ alias: 'Mike' });
  });

  it('throws when list not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await expect(leaveList('list1', 'user1')).rejects.toThrow(
      'List not found',
    );
  });
});

// --- mergeLists ---

describe('mergeLists', () => {
  function setupMergeListMocks() {
    // getList(mergeListId)
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'list2',
      data: () => ({
        personName: 'Mike B',
        collaborators: ['user1', 'user3'],
        createdBy: 'user1',
      }),
    });

    // getQuotesForList(mergeListId)
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'q1',
          data: () => ({
            text: 'Merged quote',
            personAlias: 'Mike B',
            listId: 'list2',
            createdAt: { toMillis: () => 1000 },
            createdBy: 'user1',
          }),
        },
      ],
    });

    mockUpdateDoc.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  }

  it('reassigns quotes from merge list to keep list', async () => {
    setupMergeListMocks();

    await mergeLists('list1', 'list2', 'user1');

    // updateDoc for reassigning quotes (1 quote)
    const reassignCall = mockUpdateDoc.mock.calls.find(
      ([path, data]: [string, Record<string, unknown>]) =>
        path.includes('q1') && data.listId === 'list1',
    );
    expect(reassignCall).toBeDefined();
  });

  it('adds merge list collaborators to keep list', async () => {
    setupMergeListMocks();

    await mergeLists('list1', 'list2', 'user1');

    // Should call updateDoc with arrayUnion for each collaborator
    const collabCalls = mockUpdateDoc.mock.calls.filter(
      ([, data]: [unknown, Record<string, unknown>]) =>
        (data.collaborators as Record<string, unknown>)?._arrayUnion,
    );
    expect(collabCalls.length).toBeGreaterThanOrEqual(2); // user1 and user3
  });

  it('deletes the alias for the merged list', async () => {
    setupMergeListMocks();

    await mergeLists('list1', 'list2', 'user1');

    const deleteAliasCall = mockDeleteDoc.mock.calls.find(
      ([path]: [string]) =>
        path.includes('user1') && path.includes('listAliases') && path.includes('list2'),
    );
    expect(deleteAliasCall).toBeDefined();
  });

  it('deletes the merged list', async () => {
    setupMergeListMocks();

    await mergeLists('list1', 'list2', 'user1');

    const deleteListCall = mockDeleteDoc.mock.calls.find(
      ([path]: [string]) => path.includes('lists') && path.includes('list2') && !path.includes('listAliases'),
    );
    expect(deleteListCall).toBeDefined();
  });

  it('throws when merge list not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await expect(mergeLists('list1', 'nonexistent', 'user1')).rejects.toThrow(
      'List not found',
    );
  });

  it('handles empty merge list (no quotes)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'list2',
      data: () => ({
        personName: 'Empty',
        collaborators: ['user1'],
        createdBy: 'user1',
      }),
    });
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);

    await expect(mergeLists('list1', 'list2', 'user1')).resolves.not.toThrow();

    // Should still delete the merged list
    expect(mockDeleteDoc).toHaveBeenCalled();
  });
});
