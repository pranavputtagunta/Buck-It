import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export default function AuthStep({ mode, username, email, password, onChangeUsername, onChangeEmail, onChangePassword, onSubmit, submitting }: any) {
  return (
    <View>
      <Text style={styles.title}>{mode === 'new' ? 'Secure Vibe' : 'Welcome Back'}</Text>
      <Text style={styles.subtitle}>Final step to save your progress.</Text>

      {mode === 'new' && <TextInput value={username} onChangeText={onChangeUsername} placeholder="Username" style={styles.input} placeholderTextColor="#999" />}
      <TextInput value={email} onChangeText={onChangeEmail} placeholder="Email" style={styles.input} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" />
      <TextInput value={password} onChangeText={onChangePassword} placeholder="Password" style={styles.input} secureTextEntry placeholderTextColor="#999" />

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'new' ? 'Create Account' : 'Sign In'}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 40, fontWeight: '900', color: '#000' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  input: { backgroundColor: '#F8F8F8', borderRadius: 20, padding: 18, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
  button: { backgroundColor: '#000', borderRadius: 20, padding: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});