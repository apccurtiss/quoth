import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Quote, QuoteList, ListAlias } from '@/types';

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
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Quote,
  );
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
