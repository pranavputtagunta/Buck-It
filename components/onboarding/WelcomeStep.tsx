import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  onNewUser: () => void;
  onReturningUser: () => void;
};

export default function WelcomeStep({ onNewUser, onReturningUser }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Bucket</Text>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>
        Start fresh or jump back into your next obsession.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.primaryCard,
          pressed && styles.cardPressed,
        ]}
        onPress={() => {
          console.log('New User pressed');
          onNewUser();
        }}
      >
        <Text style={styles.primaryCardTitle}>New User</Text>
        <Text style={styles.primaryCardText}>
          Build your profile, shape your vibe, and draft your first bucket list.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondaryCard,
          pressed && styles.cardPressed,
        ]}
        onPress={() => {
          console.log('Returning User pressed');
          onReturningUser();
        }}
      >
        <Text style={styles.secondaryCardTitle}>Returning User</Text>
        <Text style={styles.secondaryCardText}>
          Sign in and continue where you left off.
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  eyebrow: {
    fontSize: 14,
    color: '#666',
    fontWeight: '700',
    marginBottom: 10,
  },
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
  primaryCard: {
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  primaryCardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  primaryCardText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 20,
  },
  secondaryCardTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  secondaryCardText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  cardPressed: {
    opacity: 0.85,
  },
});