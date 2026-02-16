import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  getList,
  getListAlias,
  getQuotesForList,
  setListAlias,
} from '@/services/firestore';
import { EditAliasModal } from '@/components/edit-alias-modal';
import type { Quote, QuoteList } from '@/types';
import { Timestamp } from 'firebase/firestore';

type SortMode = 'newest' | 'oldest';

function formatDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp?.toDate) return '';
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [list, setList] = useState<QuoteList | null>(null);
  const [alias, setAlias] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>('newest');
  const [showAliasModal, setShowAliasModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const [fetchedList, fetchedAlias, fetchedQuotes] = await Promise.all([
        getList(id),
        getListAlias(user.uid, id),
        getQuotesForList(id),
      ]);
      setList(fetchedList);
      setAlias(fetchedAlias ?? fetchedList?.personName ?? '');
      setQuotes(fetchedQuotes);
    } catch (error) {
      console.error('Failed to load list:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedQuotes = useMemo(() => {
    const sorted = [...quotes];
    if (sort === 'oldest') sorted.reverse();
    return sorted;
  }, [quotes, sort]);

  async function handleSaveAlias(newAlias: string) {
    if (!user || !id) return;
    setShowAliasModal(false);
    try {
      await setListAlias(user.uid, id, newAlias);
      setAlias(newAlias);
    } catch (error) {
      console.error('Failed to update alias:', error);
    }
  }

  function handleShare() {
    const url = `https://quoth-4160d.web.app/invite/${id}`;
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        Alert.alert('Link copied', 'Share this link to invite collaborators.');
      });
    } else {
      Alert.alert('Share link', url);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <View
          style={[styles.centered, { backgroundColor: colors.background }]}
        >
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </>
    );
  }

  if (!list) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View
          style={[styles.centered, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            List not found.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: alias }} />
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {/* Header metadata */}
        <View style={styles.header}>
          <Text style={[styles.headerName, { color: colors.text }]}>
            {alias}
          </Text>
          <Text style={[styles.headerMeta, { color: colors.icon }]}>
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
            {'  ·  '}
            {list.collaborators.length} collaborator
            {list.collaborators.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, { borderColor: colors.icon + '30' }]}
            onPress={handleShare}
          >
            <Ionicons
              name="share-outline"
              size={16}
              color={colors.tint}
            />
            <Text style={[styles.actionText, { color: colors.tint }]}>
              Share
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { borderColor: colors.icon + '30' }]}
            onPress={() => setShowAliasModal(true)}
          >
            <Ionicons
              name="pencil-outline"
              size={16}
              color={colors.tint}
            />
            <Text style={[styles.actionText, { color: colors.tint }]}>
              Edit Alias
            </Text>
          </Pressable>
        </View>

        {/* Sort toggles */}
        <View style={styles.sortRow}>
          <Pressable
            style={[
              styles.sortButton,
              sort === 'newest' && {
                backgroundColor: colors.tint + '18',
                borderColor: colors.tint,
              },
              sort !== 'newest' && { borderColor: colors.icon + '30' },
            ]}
            onPress={() => setSort('newest')}
          >
            <Text
              style={[
                styles.sortText,
                { color: sort === 'newest' ? colors.tint : colors.icon },
              ]}
            >
              Newest
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.sortButton,
              sort === 'oldest' && {
                backgroundColor: colors.tint + '18',
                borderColor: colors.tint,
              },
              sort !== 'oldest' && { borderColor: colors.icon + '30' },
            ]}
            onPress={() => setSort('oldest')}
          >
            <Text
              style={[
                styles.sortText,
                { color: sort === 'oldest' ? colors.tint : colors.icon },
              ]}
            >
              Oldest
            </Text>
          </Pressable>
        </View>

        {/* Quotes list */}
        {quotes.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No quotes yet. Add one from the home screen!
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedQuotes}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={styles.quotesContent}
            renderItem={({ item }) => {
              const isCurrentUser = item.createdBy === user?.uid;
              return (
                <View
                  style={[
                    styles.quoteCard,
                    { borderColor: colors.icon + '20' },
                  ]}
                >
                  <Text style={[styles.quoteText, { color: colors.text }]}>
                    "{item.text}"
                  </Text>
                  <View style={styles.quoteFooter}>
                    <Text
                      style={[styles.quoteDate, { color: colors.icon }]}
                    >
                      {formatDate(item.createdAt)}
                    </Text>
                    {!isCurrentUser && (
                      <Text
                        style={[styles.quoteAuthor, { color: colors.icon }]}
                      >
                        Added by {item.createdBy.slice(0, 8)}...
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Edit alias modal */}
        <EditAliasModal
          visible={showAliasModal}
          currentAlias={alias}
          onSave={handleSaveAlias}
          onCancel={() => setShowAliasModal(false)}
        />
      </View>
    </>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerName: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
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
  quotesContent: {
    padding: 20,
    paddingTop: 8,
  },
  quoteCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  quoteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteDate: {
    fontSize: 12,
  },
  quoteAuthor: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
