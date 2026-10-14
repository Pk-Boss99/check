import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';

import { getAllContracts } from '../database';
import { formatDisplayDate, groupContractsByMonth } from '../contractGrouping';

export default function DashboardScreen({ navigation }) {
  const db = useSQLiteContext();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadContracts = useCallback(async () => {
    try {
      setError(null);
      const rows = await getAllContracts(db);
      setSections(groupContractsByMonth(rows));
    } catch (e) {
      setError(e?.message ?? 'Could not load contracts.');
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Re-runs on every focus, so returning from Add Contract refreshes the list.
  useFocusEffect(
    useCallback(() => {
      loadContracts();
    }, [loadContracts])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.listContent}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.customerName || 'Unnamed customer'}
            </Text>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardMetaLabel}>Date</Text>
              <Text style={styles.cardMetaValue}>{formatDisplayDate(item.eventDate)}</Text>
            </View>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardMetaLabel}>Location</Text>
              <Text style={styles.cardMetaValue} numberOfLines={2}>
                {item.location || 'Not specified'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No contracts yet</Text>
            <Text style={styles.emptyBody}>
              Tap the + button to photograph a contract and let AI read it.
            </Text>
          </View>
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add contract"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => navigation.navigate('AddContract')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  listContent: { padding: 16, paddingBottom: 96 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10 },
  cardMetaRow: { flexDirection: 'row', marginTop: 4 },
  cardMetaLabel: { width: 76, fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  cardMetaValue: { flex: 1, fontSize: 14, color: '#374151' },
  emptyState: { alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  errorBanner: { backgroundColor: '#fee2e2', padding: 12, margin: 16, borderRadius: 10 },
  errorText: { color: '#991b1b', fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { opacity: 0.85 },
  fabIcon: { color: '#ffffff', fontSize: 32, lineHeight: 34, fontWeight: '300' },
});
