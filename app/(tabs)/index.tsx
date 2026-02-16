import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/hooks/use-user-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { addQuote, createList } from '@/services/firestore';
import { ListSelectModal } from '@/components/list-select-modal';
import type { QuoteList } from '@/types';

export default function AddQuoteScreen() {
  const { user } = useAuth();
  const { lists, aliases, loading: listsLoading, refresh } = useUserLists();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [quoteText, setQuoteText] = useState('');
  const [personName, setPersonName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [matchingLists, setMatchingLists] = useState<QuoteList[]>([]);

  // Deduplicated alias names for quick-select chips
  const uniqueAliasNames = [...new Set(Object.values(aliases))].sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 2500);
  }

  function findMatchingListIds(name: string): string[] {
    const normalized = name.toLowerCase();
    return Object.entries(aliases)
      .filter(([, alias]) => alias.toLowerCase() === normalized)
      .map(([listId]) => listId);
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
      const matchingListIds = findMatchingListIds(name);

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
      ) : uniqueAliasNames.length > 0 ? (
        <View style={styles.chipsContainer}>
          {uniqueAliasNames.map((name) => {
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
        </View>
      ) : null}

      {/* Submit button */}
      <Pressable
        style={[
          styles.submitButton,
          {
            backgroundColor: colors.tint,
            opacity: canSubmit ? 1 : 0.5,
          },
        ]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitText}>Add Quote</Text>
        )}
      </Pressable>

      {/* Success message */}
      {successMessage !== '' && (
        <Text style={[styles.success, { color: colors.tint }]}>
          {successMessage}
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
    padding: 20,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
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
});
