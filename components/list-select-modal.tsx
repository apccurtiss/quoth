import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import type { QuoteList } from '@/types';

interface ListSelectModalProps {
  visible: boolean;
  matchingLists: QuoteList[];
  aliases: Record<string, string>;
  onSubmit: (selectedListIds: string[]) => void;
  onCancel: () => void;
}

export function ListSelectModal({
  visible,
  matchingLists,
  aliases,
  onSubmit,
  onCancel,
}: ListSelectModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setSelected(new Set(matchingLists.map((l) => l.id!)));
    }
  }, [visible, matchingLists]);

  const toggleList = (listId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Multiple lists match
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Select which lists to add this quote to:
          </Text>

          <FlatList
            data={matchingLists}
            keyExtractor={(item) => item.id!}
            style={styles.list}
            renderItem={({ item }) => {
              const isSelected = selected.has(item.id!);
              const alias = aliases[item.id!] ?? item.personName;
              return (
                <Pressable
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: isSelected
                        ? colors.tint + '15'
                        : 'transparent',
                      borderColor: isSelected
                        ? colors.tint
                        : colors.icon + '30',
                    },
                  ]}
                  onPress={() => toggleList(item.id!)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: isSelected ? colors.tint : colors.icon },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.checkboxInner,
                          { backgroundColor: colors.tint },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={[styles.listName, { color: colors.text }]}>
                      {alias}
                    </Text>
                    <Text style={[styles.listMeta, { color: colors.icon }]}>
                      {item.collaborators.length} collaborator
                      {item.collaborators.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.icon }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.tint,
                  opacity: selected.size === 0 ? 0.5 : 1,
                },
              ]}
              onPress={() => onSubmit(Array.from(selected))}
              disabled={selected.size === 0}
            >
              <Text style={styles.submitText}>
                Add to {selected.size} list{selected.size !== 1 ? 's' : ''}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  listItemText: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '500',
  },
  listMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
