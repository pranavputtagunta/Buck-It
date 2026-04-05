import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

type Props = {
  mode: 'new' | 'returning';
  username: string;
  email: string;
  password: string;
  onChangeUsername: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  disabled?: boolean;
};

export default function AuthStep({
  mode,
  username,
  email,
  password,
  onChangeUsername,
  onChangeEmail,
  onChangePassword,
  onSubmit,
  submitting,
  disabled,
}: Props) {
  return (
    <View>
      <Text style={styles.title}>{mode === 'returning' ? 'Sign in' : 'Create account'}</Text>
      <Text style={styles.subtitle}>
        {mode === 'returning'
          ? 'Jump back into your bucket.'
          : 'Secure your profile and save your setup.'}
      </Text>

      {mode !== 'returning' && (
        <TextInput
          value={username}
          onChangeText={onChangeUsername}
          placeholder="Username"
          placeholderTextColor="#999"
          style={styles.input}
        />
      )}

      <TextInput
        value={email}
        onChangeText={onChangeEmail}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        value={password}
        onChangeText={onChangePassword}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={disabled}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === 'returning' ? 'Sign in' : 'Create account'}
          </Text>
        )}
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
});