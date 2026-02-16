import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/hooks/use-user-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { getQuotesForLists } from '@/services/firestore';
import { groupQuotesByList } from '@/utils/quotes';
import type { Quote } from '@/types';

type SortMode = 'alpha' | 'recent';

export default function ListsScreen() {
  const { user } = useAuth();
  const { lists, aliases, loading: listsLoading, refresh } = useUserLists();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('alpha');
  const [quotesByList, setQuotesByList] = useState<Record<string, Quote[]>>(
    {},
  );
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Refresh lists when tab is focused
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Fetch quotes for all lists once lists are loaded
  useEffect(() => {
    async function fetchQuotes() {
      const listIds = lists.map((l) => l.id!).filter(Boolean);
      if (listIds.length === 0) {
        setQuotesByList({});
        return;
      }
      setQuotesLoading(true);
      try {
        const allQuotes = await getQuotesForLists(listIds);
        setQuotesByList(groupQuotesByList(allQuotes));
      } catch (error) {
        console.error('Failed to fetch quotes:', error);
      } finally {
        setQuotesLoading(false);
      }
    }
    if (!listsLoading && lists.length > 0) {
      fetchQuotes();
    }
  }, [lists, listsLoading]);

  // Filter and sort lists
  const displayLists = useMemo(() => {
    let filtered = lists.filter((l) => {
      const alias = aliases[l.id!] ?? l.personName;
      return alias.toLowerCase().includes(search.toLowerCase());
    });

    if (sort === 'alpha') {
      filtered.sort((a, b) => {
        const aName = aliases[a.id!] ?? a.personName;
        const bName = aliases[b.id!] ?? b.personName;
        return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
      });
    } else {
      // Most recently active (latest quote timestamp)
      filtered.sort((a, b) => {
        const aQuotes = quotesByList[a.id!];
        const bQuotes = quotesByList[b.id!];
        const aTime = aQuotes?.[0]?.createdAt?.toMillis?.() ?? 0;
        const bTime = bQuotes?.[0]?.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
    }

    return filtered;
  }, [lists, aliases, search, sort, quotesByList]);

  const loading = listsLoading || quotesLoading;

  if (listsLoading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.searchInput,
            {
              color: colors.text,
              backgroundColor: colors.icon + '10',
              borderColor: colors.icon + '30',
            },
          ]}
          placeholder="Search lists..."
          placeholderTextColor={colors.icon + '80'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Sort toggles */}
      <View style={styles.sortRow}>
        <Pressable
          style={[
            styles.sortButton,
            sort === 'alpha' && {
              backgroundColor: colors.tint + '18',
              borderColor: colors.tint,
            },
            sort !== 'alpha' && { borderColor: colors.icon + '30' },
          ]}
          onPress={() => setSort('alpha')}
        >
          <Text
            style={[
              styles.sortText,
              { color: sort === 'alpha' ? colors.tint : colors.icon },
            ]}
          >
            A-Z
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.sortButton,
            sort === 'recent' && {
              backgroundColor: colors.tint + '18',
              borderColor: colors.tint,
            },
            sort !== 'recent' && { borderColor: colors.icon + '30' },
          ]}
          onPress={() => setSort('recent')}
        >
          <Text
            style={[
              styles.sortText,
              { color: sort === 'recent' ? colors.tint : colors.icon },
            ]}
          >
            Recent
          </Text>
        </Pressable>
      </View>

      {/* List */}
      {lists.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No lists yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
            Add your first quote to get started!
          </Text>
        </View>
      ) : displayLists.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
            No lists match "{search}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayLists}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const alias = aliases[item.id!] ?? item.personName;
            const quotes = quotesByList[item.id!];
            const count = quotes?.length ?? 0;
            const preview = quotes?.[0]?.text;
            return (
              <Pressable
                style={[
                  styles.card,
                  { borderColor: colors.icon + '20' },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/list/[id]',
                    params: { id: item.id! },
                  })
                }
              >
                <Text style={[styles.cardName, { color: colors.text }]}>
                  {alias}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.icon }]}>
                  {quotesLoading ? '...' : count} quote
                  {count !== 1 ? 's' : ''}
                  {'  ·  '}
                  {item.collaborators.length} collaborator
                  {item.collaborators.length !== 1 ? 's' : ''}
                </Text>
                {preview && (
                  <Text
                    style={[styles.cardPreview, { color: colors.icon }]}
                    numberOfLines={2}
                  >
                    "{preview}"
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    marginBottom: 6,
  },
  cardPreview: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
});
