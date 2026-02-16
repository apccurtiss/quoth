import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserLists, getUserListAliases } from '@/services/firestore';
import type { QuoteList } from '@/types';

interface UserListsData {
  lists: QuoteList[];
  aliases: Record<string, string>;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useUserLists(): UserListsData {
  const { user } = useAuth();
  const [lists, setLists] = useState<QuoteList[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fetchedLists, fetchedAliases] = await Promise.all([
        getUserLists(user.uid),
        getUserListAliases(user.uid),
      ]);
      setLists(fetchedLists);
      setAliases(fetchedAliases);
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lists, aliases, loading, refresh };
}
