import { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { parseQuoteCsv, importQuotes } from '@/services/import';
import type { ParsedQuote, ImportResult } from '@/services/import';

interface ImportModalProps {
  visible: boolean;
  userId: string;
  aliases: Record<string, string>;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'pick' | 'preview' | 'importing' | 'done';

export function ImportModal({
  visible,
  userId,
  aliases,
  onClose,
  onComplete,
}: ImportModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('pick');
  const [parsed, setParsed] = useState<ParsedQuote[]>([]);
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setStep('pick');
    setParsed([]);
    setParseError('');
    setResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileRead(text: string) {
    try {
      const rows = parseQuoteCsv(text);
      if (rows.length === 0) {
        setParseError('No valid rows found in CSV.');
        return;
      }
      setParsed(rows);
      setParseError('');
      setStep('preview');
    } catch (err: any) {
      setParseError(err.message);
    }
  }

  function handlePickFile() {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleFileRead(reader.result as string);
    reader.readAsText(file);
  }

  async function handleImport() {
    setStep('importing');
    try {
      const res = await importQuotes(parsed, userId, aliases);
      setResult(res);
      setStep('done');
      onComplete();
    } catch (err: any) {
      setResult({ created: 0, listsCreated: 0, errors: [err.message] });
      setStep('done');
    }
  }

  const previewRows = parsed.slice(0, 5);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Import from CSV
          </Text>

          {/* Hidden file input for web */}
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef as any}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange as any}
            />
          )}

          {step === 'pick' && (
            <View>
              <Text style={[styles.subtitle, { color: colors.icon }]}>
                CSV format: person, quote, date (date optional)
              </Text>
              <Pressable
                style={[styles.pickButton, { backgroundColor: colors.tint }]}
                onPress={handlePickFile}
              >
                <Ionicons
                  name="document-outline"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.pickButtonText}>Choose CSV File</Text>
              </Pressable>
              {parseError !== '' && (
                <Text style={styles.error}>{parseError}</Text>
              )}
            </View>
          )}

          {step === 'preview' && (
            <View>
              <Text style={[styles.subtitle, { color: colors.icon }]}>
                {parsed.length} quote{parsed.length !== 1 ? 's' : ''} found
              </Text>
              <ScrollView style={styles.previewScroll}>
                {previewRows.map((row, i) => (
                  <View
                    key={i}
                    style={[
                      styles.previewRow,
                      { borderColor: colors.icon + '30' },
                    ]}
                  >
                    <Text
                      style={[styles.previewPerson, { color: colors.tint }]}
                    >
                      {row.person}
                    </Text>
                    <Text
                      style={[styles.previewText, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      "{row.text}"
                    </Text>
                    {row.date && (
                      <Text
                        style={[styles.previewDate, { color: colors.icon }]}
                      >
                        {row.date.toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                ))}
                {parsed.length > 5 && (
                  <Text style={[styles.moreText, { color: colors.icon }]}>
                    ...and {parsed.length - 5} more
                  </Text>
                )}
              </ScrollView>
              <View style={styles.buttons}>
                <Pressable style={styles.cancelButton} onPress={handleClose}>
                  <Text style={[styles.cancelText, { color: colors.icon }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.importButton,
                    { backgroundColor: colors.tint },
                  ]}
                  onPress={handleImport}
                >
                  <Text style={styles.importButtonText}>
                    Import {parsed.length} Quote
                    {parsed.length !== 1 ? 's' : ''}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 'importing' && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.importingText, { color: colors.icon }]}>
                Importing quotes...
              </Text>
            </View>
          )}

          {step === 'done' && result && (
            <View>
              <Text style={[styles.resultText, { color: colors.text }]}>
                {result.created} quote{result.created !== 1 ? 's' : ''} imported
              </Text>
              {result.listsCreated > 0 && (
                <Text style={[styles.resultDetail, { color: colors.icon }]}>
                  {result.listsCreated} new list
                  {result.listsCreated !== 1 ? 's' : ''} created
                </Text>
              )}
              {result.errors.length > 0 && (
                <Text style={styles.error}>
                  {result.errors.length} error
                  {result.errors.length !== 1 ? 's' : ''}:{' '}
                  {result.errors[0]}
                </Text>
              )}
              <Pressable
                style={[styles.doneButton, { backgroundColor: colors.tint }]}
                onPress={handleClose}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          )}

          {(step === 'pick') && (
            <Pressable style={styles.closeLink} onPress={handleClose}>
              <Text style={[styles.cancelText, { color: colors.icon }]}>
                Cancel
              </Text>
            </Pressable>
          )}
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
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  previewScroll: {
    maxHeight: 240,
    marginBottom: 16,
  },
  previewRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  previewPerson: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewText: {
    fontSize: 14,
  },
  previewDate: {
    fontSize: 12,
    marginTop: 4,
  },
  moreText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
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
  importButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  importingText: {
    fontSize: 15,
    marginTop: 16,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultDetail: {
    fontSize: 14,
    marginBottom: 8,
  },
  doneButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeLink: {
    alignItems: 'center',
    marginTop: 16,
  },
});
