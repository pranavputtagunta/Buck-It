import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function ProfileStep({ personality, hobbiesInput, location, onChangePersonality, onChangeHobbiesInput, onChangeLocation, onContinue }: any) {
  const disabled = !personality || !hobbiesInput || !location;
  return (
    <View>
      <Text style={styles.title}>Your vibe</Text>
      <Text style={styles.subtitle}>Tell us where you are and what you're about.</Text>
      
      <TextInput value={location} onChangeText={onChangeLocation} placeholder="Current City" style={styles.input} placeholderTextColor="#999" />
      <TextInput value={personality} onChangeText={onChangePersonality} placeholder="Adventurous, creative..." style={styles.input} placeholderTextColor="#999" />
      <TextInput value={hobbiesInput} onChangeText={onChangeHobbiesInput} placeholder="Hiking, coding, surfing..." style={[styles.input, { height: 100 }]} multiline placeholderTextColor="#999" />

      <TouchableOpacity style={[styles.button, disabled && { opacity: 0.5 }]} onPress={onContinue} disabled={disabled}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, color: '#000' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  input: { backgroundColor: '#F8F8F8', borderRadius: 20, padding: 18, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE', color: '#000' },
  button: { backgroundColor: '#000', borderRadius: 20, padding: 18, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});