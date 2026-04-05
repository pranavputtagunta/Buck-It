import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { BucketDraftItem } from '../../app/types/onboarding';

type Props = {
  bucketList: BucketDraftItem[];
  onGenerateWithAI: () => void;
  onAddManual: () => void;
  onUpdateBucket: (
    index: number,
    key: keyof BucketDraftItem,
    value: string
  ) => void;
  onContinue: () => void;
  generating?: boolean;
  continueDisabled?: boolean;
};

export default function BucketListStep({
  bucketList,
  onGenerateWithAI,
  onAddManual,
  onUpdateBucket,
  onContinue,
  generating,
  continueDisabled,
}: Props) {
  return (
    <View>
      <Text style={styles.title}>Draft your bucket list</Text>
      <Text style={styles.subtitle}>
        Make your own list or let AI generate the first version.
      </Text>

      <TouchableOpacity
        style={[styles.button, generating && styles.buttonDisabled]}
        onPress={onGenerateWithAI}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Generate with AI</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.outlineButton} onPress={onAddManual}>
        <Text style={styles.outlineButtonText}>Add item manually</Text>
      </TouchableOpacity>

      {bucketList.map((item, index) => (
        <View key={`bucket-${index}`} style={styles.bucketCard}>
          <TextInput
            value={item.title}
            onChangeText={(text) => onUpdateBucket(index, 'title', text)}
            placeholder="Bucket list goal"
            placeholderTextColor="#999"
            style={styles.input}
          />

          <TextInput
            value={item.category}
            onChangeText={(text) => onUpdateBucket(index, 'category', text)}
            placeholder="Category"
            placeholderTextColor="#999"
            style={styles.input}
          />

          <TextInput
            value={item.deadline ?? ''}
            onChangeText={(text) => onUpdateBucket(index, 'deadline', text)}
            placeholder="Deadline (YYYY-MM-DD)"
            placeholderTextColor="#999"
            style={styles.input}
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.button, continueDisabled && styles.buttonDisabled]}
        onPress={onContinue}
        disabled={continueDisabled}
      >
        <Text style={styles.buttonText}>Continue to account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    marginBottom: 28,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#000',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  outlineButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  bucketCard: {
    backgroundColor: '#fafafa',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
});