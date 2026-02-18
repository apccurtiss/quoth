import { useEffect, useState } from 'react';
import { getQuotesForLists } from '@/services/firestore';
import type { QuoteList } from '@/types';

export function useLastQuoted(
  lists: QuoteList[],
  aliases: Record<string, string>,
  enabled: boolean,
): Record<string, number> {
  const [lastQuoted, setLastQuoted] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled || lists.length === 0) return;

    const listIds = lists.map((l) => l.id!).filter(Boolean);
    if (listIds.length === 0) return;

    getQuotesForLists(listIds)
      .then((quotes) => {
        const result: Record<string, number> = {};
        for (const q of quotes) {
          const alias = aliases[q.listId] ?? '';
          if (!alias) continue;
          const ts = q.createdAt?.toMillis?.() ?? 0;
          if (ts > (result[alias] ?? 0)) {
            result[alias] = ts;
          }
        }
        setLastQuoted(result);
      })
      .catch(() => {
        // Fail silently — chip ordering is non-critical
      });
  }, [lists, aliases, enabled]);

  return lastQuoted;
}
