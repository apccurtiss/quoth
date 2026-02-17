import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Quote, QuoteList, ListAlias, Invite } from '@/types';

// --- Lists ---

export async function createList(
  personName: string,
  userId: string,
): Promise<string> {
  const listRef = await addDoc(collection(db, 'lists'), {
    personName,
    collaborators: [userId],
    createdAt: serverTimestamp(),
    createdBy: userId,
  });

  // Create alias for the creator
  await setDoc(doc(db, 'users', userId, 'listAliases', listRef.id), {
    alias: personName,
  });

  return listRef.id;
}

export async function getUserLists(userId: string): Promise<QuoteList[]> {
  const q = query(
    collection(db, 'lists'),
    where('collaborators', 'array-contains', userId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as QuoteList,
  );
}

export async function getList(listId: string): Promise<QuoteList | null> {
  const snap = await getDoc(doc(db, 'lists', listId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as QuoteList;
}

export async function addCollaborator(
  listId: string,
  userId: string,
): Promise<void> {
  await updateDoc(doc(db, 'lists', listId), {
    collaborators: arrayUnion(userId),
  });
}

// --- Quotes ---

export async function addQuote(
  text: string,
  personAlias: string,
  listId: string,
  userId: string,
): Promise<string> {
  const quoteRef = await addDoc(collection(db, 'quotes'), {
    text,
    personAlias,
    listId,
    createdAt: serverTimestamp(),
    createdBy: userId,
  });
  return quoteRef.id;
}

export async function getQuotesForList(listId: string): Promise<Quote[]> {
  const q = query(
    collection(db, 'quotes'),
    where('listId', '==', listId),
  );
  const snapshot = await getDocs(q);
  const quotes = snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Quote,
  );
  // Sort client-side to avoid requiring a composite Firestore index
  return quotes.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

export async function getQuotesForLists(
  listIds: string[],
): Promise<Quote[]> {
  if (listIds.length === 0) return [];

  // Firestore 'in' queries limited to 30 values; batch if needed
  const results: Quote[] = [];
  for (let i = 0; i < listIds.length; i += 30) {
    const batch = listIds.slice(i, i + 30);
    const q = query(
      collection(db, 'quotes'),
      where('listId', 'in', batch),
    );
    const snapshot = await getDocs(q);
    results.push(
      ...snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Quote),
    );
  }
  // Sort client-side to avoid requiring a composite Firestore index
  return results.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

// --- List Aliases ---

export async function getListAlias(
  userId: string,
  listId: string,
): Promise<string | null> {
  const snap = await getDoc(
    doc(db, 'users', userId, 'listAliases', listId),
  );
  if (!snap.exists()) return null;
  return (snap.data() as ListAlias).alias;
}

export async function getUserListAliases(
  userId: string,
): Promise<Record<string, string>> {
  const snapshot = await getDocs(
    collection(db, 'users', userId, 'listAliases'),
  );
  const aliases: Record<string, string> = {};
  snapshot.docs.forEach((d) => {
    aliases[d.id] = (d.data() as ListAlias).alias;
  });
  return aliases;
}

export async function setListAlias(
  userId: string,
  listId: string,
  alias: string,
): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'listAliases', listId), { alias });
}

export async function deleteListAlias(
  userId: string,
  listId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'listAliases', listId));
}

// --- Invites ---

export async function createInvite(
  listId: string,
  listName: string,
  userId: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'invites'), {
    listId,
    listName,
    createdBy: userId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getInvite(inviteId: string): Promise<Invite | null> {
  const snap = await getDoc(doc(db, 'invites', inviteId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Invite;
}

// --- Collaboration operations ---

export async function removeCollaborator(
  listId: string,
  userId: string,
): Promise<void> {
  await updateDoc(doc(db, 'lists', listId), {
    collaborators: arrayRemove(userId),
  });
}

export async function deleteList(listId: string): Promise<void> {
  await deleteDoc(doc(db, 'lists', listId));
}

/**
 * Leave a list: fork a personal copy with all current quotes,
 * then remove the user from the original list.
 * Returns the new list's ID.
 */
export async function leaveList(
  listId: string,
  userId: string,
): Promise<string> {
  const [list, currentAlias, quotes] = await Promise.all([
    getList(listId),
    getListAlias(userId, listId),
    getQuotesForList(listId),
  ]);
  if (!list) throw new Error('List not found');

  // Create new list (also creates alias with personName)
  const newListId = await createList(list.personName, userId);

  // Preserve the user's custom alias if it differs from personName
  if (currentAlias && currentAlias !== list.personName) {
    await setListAlias(userId, newListId, currentAlias);
  }

  // Copy all quotes to the new list
  await Promise.all(
    quotes.map((q) =>
      addDoc(collection(db, 'quotes'), {
        text: q.text,
        personAlias: q.personAlias,
        listId: newListId,
        createdAt: q.createdAt,
        createdBy: q.createdBy,
      }),
    ),
  );

  // Remove user from original list and clean up old alias
  await Promise.all([
    removeCollaborator(listId, userId),
    deleteListAlias(userId, listId),
  ]);

  return newListId;
}

/**
 * Merge mergeListId into keepListId:
 * reassign all quotes, merge collaborators, delete the source list.
 */
export async function mergeLists(
  keepListId: string,
  mergeListId: string,
  userId: string,
): Promise<void> {
  const [mergeList, quotes] = await Promise.all([
    getList(mergeListId),
    getQuotesForList(mergeListId),
  ]);
  if (!mergeList) throw new Error('List not found');

  // Reassign all quotes from mergeList to keepList
  await Promise.all(
    quotes.map((q) =>
      updateDoc(doc(db, 'quotes', q.id!), { listId: keepListId }),
    ),
  );

  // Add mergeList's collaborators to keepList
  for (const collabId of mergeList.collaborators) {
    await addCollaborator(keepListId, collabId);
  }

  // Clean up current user's alias for the merged list
  await deleteListAlias(userId, mergeListId);

  // Delete the merged list
  await deleteList(mergeListId);
}
