import React, { useState, useEffect, useRef } from 'react';
import { Alert, SafeAreaView, View, StyleSheet, ScrollView, Animated } from 'react-native';
import { supabase } from '../../app/lib/supabase';
import { C } from './theme';
import WelcomeStep from './WelcomeStep';
import ProfileStep from './ProfileStep';
import BucketListStep from './BucketListStep';
import AuthStep from './AuthStep';

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const animatedStep = useRef(new Animated.Value(0)).current;

  const [draft, setDraft] = useState({
    mode: 'new' as 'new' | 'returning',
    username: '',
    email: '',
    password: '',
    personality: '',
    hobbiesInput: '',
    location: '',
    bucketList: [] as any[],
  });

  useEffect(() => {
    Animated.spring(animatedStep, {
      toValue: step,
      friction: 8,
      tension: 50,
      useNativeDriver: false,
    }).start();
  }, [step]);

  // ─── LOGIC: Returning User ───
  const handleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: draft.email.trim(),
        password: draft.password,
      });

      if (error) throw error;

      // Successfully signed in
      onComplete();
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── LOGIC: New User ───
  const handleCreateAccount = async () => {
    try {
      setIsSubmitting(true);
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
      
      // 1. Supabase Auth Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: draft.email.trim(),
        password: draft.password,
      });

      if (error) throw error;

      // 2. Sync Profile to Backend
      const response = await fetch(`${apiBase}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.user?.id,
          username: draft.username.trim(),
          personality: draft.personality.trim(),
          location: draft.location.trim(),
          hobbies: draft.hobbiesInput.split(',').map(h => h.trim()).filter(h => h !== ""),
          bucket_list: draft.bucketList,
          onboarding_data: {},
        }),
      });

      if (!response.ok) throw new Error('Backend sync failed');
      
      onComplete();
    } catch (err: any) {
      Alert.alert('Sign Up Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <WelcomeStep
            onNewUser={() => {
              setDraft(d => ({ ...d, mode: 'new' }));
              setStep(1);
            }}
            onReturningUser={() => {
              setDraft(d => ({ ...d, mode: 'returning' }));
              setStep(3); // Skip Vibe/Bucket steps for returning users
            }}
          />
        );
      case 1:
        return (
          <ProfileStep
            {...draft}
            onChangeLocation={v => setDraft(d => ({ ...d, location: v }))}
            onChangePersonality={v => setDraft(d => ({ ...d, personality: v }))}
            onChangeHobbiesInput={v => setDraft(d => ({ ...d, hobbiesInput: v }))}
            onContinue={() => setStep(2)}
          />
        );
      case 2:
        return (
          <BucketListStep
            bucketList={draft.bucketList}
            onUpdateBucket={(i: number, k: any, v: any) => {
              const n = [...draft.bucketList];
              n[i] = { ...n[i], [k]: v };
              setDraft(d => ({ ...d, bucketList: n }));
            }}
            onAddManual={() =>
              setDraft(d => ({ ...d, bucketList: [...d.bucketList, { title: '', category: '', deadline: '' }] }))
            }
            onContinue={() => setStep(3)}
            onRemoveBucket={(indexToRemove: number) => {
              setDraft(d => {
                const newList = [...d.bucketList];
                newList.splice(indexToRemove, 1);
                return { ...d, bucketList: newList };
              });
            }}
          />
        );
      case 3:
        return (
          <AuthStep
            mode={draft.mode}
            {...draft}
            onChangeUsername={v => setDraft(d => ({ ...d, username: v }))}
            onChangeEmail={v => setDraft(d => ({ ...d, email: v }))}
            onChangePassword={v => setDraft(d => ({ ...d, password: v }))}
            // Switch function based on mode
            onSubmit={draft.mode === 'new' ? handleCreateAccount : handleSignIn}
            submitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Progress pills */}
      <View style={styles.pillRow}>
        {[0, 1, 2, 3].map(i => {
          const width = animatedStep.interpolate({
            inputRange: [i - 1, i, i + 1],
            outputRange: [8, 28, 8],
            extrapolate: 'clamp',
          });
          const backgroundColor = animatedStep.interpolate({
            inputRange: [i - 1, i, i + 1],
            outputRange: [C.border, C.accentDark, C.border],
            extrapolate: 'clamp',
          });
          return <Animated.View key={i} style={[styles.pill, { width, backgroundColor }]} />;
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 28, paddingTop: 44, paddingBottom: 110, flexGrow: 1, justifyContent: 'center' },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: C.bg,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  pill: { height: 5, borderRadius: 99 },
});