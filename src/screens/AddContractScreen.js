import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';

import { insertContract, normaliseImagePath } from '../database';
import { extractContractDetails } from '../gemini';

export default function AddContractScreen({ navigation }) {
  const db = useSQLiteContext();
  const [imageUri, setImageUri] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const runExtraction = async (uri) => {
    setReading(true);
    try {
      const details = await extractContractDetails(uri);
      setCustomerName(details.customerName);
      setEventDate(details.eventDate);
      setLocation(details.location);
    } catch (e) {
      Alert.alert(
        'Could not read contract',
        `${e?.message ?? 'Unknown error'}\n\nYou can still type the details in manually.`
      );
    } finally {
      setReading(false);
    }
  };

  const handlePickedResult = (result) => {
    if (result.canceled || !result.assets?.length) return;
    const uri = normaliseImagePath(result.assets[0].uri);
    if (!uri) {
      Alert.alert('Unsupported image', 'That image could not be stored on this device.');
      return;
    }
    setImageUri(uri);
    runExtraction(uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Enable camera access to photograph contracts.');
      return;
    }
    // Base64 is not requested here: Gemini needs it, but we re-read the file from
    // disk in gemini.js, which avoids holding a multi-MB string in component state.
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    handlePickedResult(result);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Gallery permission needed', 'Enable photo access to choose a contract image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    handlePickedResult(result);
  };

  const saveContract = async () => {
    if (!customerName.trim() && !location.trim()) {
      Alert.alert('Nothing to save', 'Add at least a customer name or a location.');
      return;
    }

    setSaving(true);
    try {
      await insertContract(db, {
        customerName: customerName.trim(),
        eventDate: eventDate.trim(),
        location: location.trim(),
        localImagePath: imageUri ?? '',
      });
      navigation.navigate('Dashboard');
    } catch (e) {
      Alert.alert('Save failed', e?.message ?? 'The contract could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {imageUri ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No contract image selected</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={takePhoto}
            disabled={reading}
          >
            <Text style={styles.secondaryButtonText}>Take Photo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={pickFromGallery}
            disabled={reading}
          >
            <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
          </Pressable>
        </View>

        {reading ? (
          <View style={styles.readingBox}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.readingText}>Reading contract details...</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Customer Name</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="e.g. Ramesh Sharma"
            placeholderTextColor="#9ca3af"
            editable={!reading}
          />

          <Text style={styles.label}>Event Date</Text>
          <TextInput
            style={styles.input}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            editable={!reading}
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={location}
            onChangeText={setLocation}
            placeholder="Venue, street, city"
            placeholderTextColor="#9ca3af"
            multiline
            editable={!reading}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          onPress={saveContract}
          disabled={saving || reading}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Contract</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, paddingBottom: 40 },
  previewWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  preview: { width: '100%', height: 220 },
  placeholder: {
    height: 180,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  placeholderText: { color: '#9ca3af', fontSize: 14 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.75 },
  readingBox: { alignItems: 'center', paddingVertical: 24 },
  readingText: { marginTop: 12, color: '#4f46e5', fontSize: 15, fontWeight: '600' },
  form: { marginTop: 8 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  multilineInput: { minHeight: 84, textAlignVertical: 'top' },
  saveButton: {
    marginTop: 28,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
