import { createList, addCollaborator } from '@/services/firestore';

export async function createListWithAutoShare(
  personName: string,
  userId: string,
  autoShareWith: string[],
): Promise<string> {
  const listId = await createList(personName, userId);
  if (autoShareWith.length > 0) {
    await Promise.all(autoShareWith.map((uid) => addCollaborator(listId, uid)));
  }
  return listId;
}
