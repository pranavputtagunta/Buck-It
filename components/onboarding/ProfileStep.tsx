import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  personality: string;
  hobbiesInput: string;
  onChangePersonality: (value: string) => void;
  onChangeHobbiesInput: (value: string) => void;
  onContinue: () => void;
  onChangeLocation: (value: string) => void;
  location: string;
  disabled?: boolean;
};

export default function ProfileStep({
  personality,
  hobbiesInput,
  onChangePersonality,
  onChangeHobbiesInput,
  onChangeLocation,
  location,
  onContinue,

  disabled,
}: Props) {
  return (
    <View>
      <Text style={styles.title}>Your vibe</Text>
      <Text style={styles.subtitle}>
        Tell us your personality and a few hobbies.
      </Text>
        <TextInput
        value={location}
        onChangeText={onChangeLocation}
        placeholder="Location"
        placeholderTextColor="#999"
        style={styles.input}
        />
      <TextInput
        value={personality}
        onChangeText={onChangePersonality}
        placeholder="Adventurous, creative, ambitious..."
        placeholderTextColor="#999"
        style={styles.input}
      />

      <TextInput
        value={hobbiesInput}
        onChangeText={onChangeHobbiesInput}
        placeholder="Hiking, photography, coding..."
        placeholderTextColor="#999"
        style={[styles.input, styles.textArea]}
        multiline
      />

      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onContinue}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>Continue</Text>
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
});