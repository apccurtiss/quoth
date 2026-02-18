import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserLists, getUserListAliases } from '@/services/firestore';
import type { QuoteList } from '@/types';

interface UserListsData {
  lists: QuoteList[];
  aliases: Record<string, string>;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export function useUserLists(): UserListsData {
  const { user } = useAuth();
  const [lists, setLists] = useState<QuoteList[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [fetchedLists, fetchedAliases] = await Promise.all([
        getUserLists(user.uid),
        getUserListAliases(user.uid),
      ]);
      setLists(fetchedLists);
      setAliases(fetchedAliases);
    } catch (err) {
      console.error('Failed to fetch lists:', err);
      setError('Failed to load lists. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lists, aliases, loading, error, refresh };
}
