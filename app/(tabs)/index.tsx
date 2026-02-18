import { ListSelectModal } from '@/components/list-select-modal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLastQuoted } from '@/hooks/use-last-quoted';
import { useUserLists } from '@/hooks/use-user-lists';
import { addQuote, createList } from '@/services/firestore';
import type { QuoteList } from '@/types';
import { findMatchingListIds } from '@/utils/quotes';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AddQuoteScreen() {
  const { user, isAnonymous } = useAuth();
  const { lists, aliases, loading: listsLoading, refresh } = useUserLists();
  const lastQuoted = useLastQuoted(lists, aliases, !listsLoading);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [quoteText, setQuoteText] = useState('');
  const [personName, setPersonName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showLinkBanner, setShowLinkBanner] = useState(false);

  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('googlePromptDismissed');
      setShowLinkBanner(isAnonymous && !dismissed);
    } catch {
      setShowLinkBanner(isAnonymous);
    }
  }, [isAnonymous]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [matchingLists, setMatchingLists] = useState<QuoteList[]>([]);

  // Smart chip ordering: recency-first, alpha fallback
  const sortedAliasNames = useMemo(() => {
    const unique = [...new Set(Object.values(aliases))];
    return unique.sort((a, b) => {
      const aTime = lastQuoted[a] ?? 0;
      const bTime = lastQuoted[b] ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  }, [aliases, lastQuoted]);

  function showError(message: string) {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3500);
  }

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 2500);
    submitScale.value = withSequence(
      withTiming(1.06, { duration: 120 }),
      withTiming(1, { duration: 120 }),
    );
  }

  async function submitQuoteToLists(listIds: string[]) {
    if (!user) return;
    const text = quoteText.trim();
    const name = personName.trim();

    await Promise.all(
      listIds.map((listId) => addQuote(text, name, listId, user.uid)),
    );

    setQuoteText('');
    setPersonName('');
    await refresh();
    showSuccess(
      listIds.length === 1
        ? 'Quote added!'
        : `Quote added to ${listIds.length} lists!`,
    );
  }

  async function handleSubmit() {
    const text = quoteText.trim();
    const name = personName.trim();
    if (!text || !name || !user) return;

    setSubmitting(true);
    try {
      const matchingListIds = findMatchingListIds(aliases, name);

      if (matchingListIds.length === 0) {
        // New person — create list then add quote
        const listId = await createList(name, user.uid);
        await addQuote(text, name, listId, user.uid);
        setQuoteText('');
        setPersonName('');
        await refresh();
        showSuccess(`Quote added! Created list for "${name}".`);
      } else if (matchingListIds.length === 1) {
        // Single match — add directly
        await submitQuoteToLists(matchingListIds);
      } else {
        // Multiple matches — show selection modal
        const matching = lists.filter((l) =>
          matchingListIds.includes(l.id!),
        );
        setMatchingLists(matching);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Failed to add quote:', error);
      showError('Failed to add quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleModalSubmit(selectedListIds: string[]) {
    setShowModal(false);
    setSubmitting(true);
    try {
      await submitQuoteToLists(selectedListIds);
    } catch (error) {
      console.error('Failed to add quote:', error);
      showError('Failed to add quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    quoteText.trim().length > 0 &&
    personName.trim().length > 0 &&
    !submitting;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Link account banner */}
      {showLinkBanner && (
        <View style={[styles.banner, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerText, { color: colors.text }]}>
              Protect your quotes — Link a Google account
            </Text>
            <View style={styles.bannerActions}>
              <Pressable
                style={[styles.bannerLink, { backgroundColor: colors.tint }]}
                onPress={() => router.push('/settings')}
              >
                <Text style={styles.bannerLinkText}>Link</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  try { localStorage.setItem('googlePromptDismissed', '1'); } catch {}
                  setShowLinkBanner(false);
                }}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={colors.icon} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Quote input */}
      <Text style={[styles.label, { color: colors.text }]}>The quote</Text>
      <TextInput
        style={[
          styles.quoteInput,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.icon + '40',
          },
        ]}
        placeholder={'"Something memorable..."'}
        placeholderTextColor={colors.icon + '80'}
        value={quoteText}
        onChangeText={setQuoteText}
        multiline
        textAlignVertical="top"
      />

      {/* Person name input */}
      <Text style={[styles.label, { color: colors.text }]}>Who said it?</Text>
      <TextInput
        style={[
          styles.personInput,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.icon + '40',
          },
        ]}
        placeholder="Person's name"
        placeholderTextColor={colors.icon + '80'}
        value={personName}
        onChangeText={setPersonName}
        autoCapitalize="words"
      />

      {/* Quick-select chips */}
      {listsLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.tint}
          style={styles.chipsLoading}
        />
      ) : sortedAliasNames.length > 0 ? (
        <View style={styles.chipsContainer}>
          {sortedAliasNames.map((name) => {
            const isActive =
              name.toLowerCase() === personName.trim().toLowerCase();
            return (
              <Pressable
                key={name}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.tint
                      : colors.icon + '15',
                    borderColor: isActive ? colors.tint : colors.icon + '30',
                  },
                ]}
                onPress={() => setPersonName(name)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? '#fff' : colors.text },
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
          {/* New Person chip */}
          <Pressable
            style={[
              styles.chip,
              styles.newPersonChip,
              { borderColor: colors.icon + '50' },
            ]}
            onPress={() => setPersonName('')}
          >
            <Ionicons name="add" size={16} color={colors.icon} />
            <Text style={[styles.chipText, { color: colors.icon }]}>
              New Person
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Submit button */}
      <AnimatedPressable
        style={[
          styles.submitButton,
          {
            backgroundColor: colors.tint,
            opacity: canSubmit ? 1 : 0.5,
          },
          submitAnimStyle,
        ]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitText}>Add Quote</Text>
        )}
      </AnimatedPressable>

      {/* Success message */}
      {successMessage !== '' && (
        <Text style={[styles.success, { color: colors.tint }]}>
          {successMessage}
        </Text>
      )}

      {/* Error message */}
      {errorMessage !== '' && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errorMessage}
        </Text>
      )}

      {/* List selection modal */}
      <ListSelectModal
        visible={showModal}
        matchingLists={matchingLists}
        aliases={aliases}
        onSubmit={handleModalSubmit}
        onCancel={() => setShowModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 4,
    paddingBottom: 40,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  quoteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    minHeight: 120,
    lineHeight: 22,
  },
  personInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chipsLoading: {
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  newPersonChip: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  success: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  banner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerLinkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
