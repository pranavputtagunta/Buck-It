import React, { useState, useEffect, useRef } from 'react';
import { Alert, SafeAreaView, View, StyleSheet, Platform, UIManager, ScrollView, Animated } from 'react-native';
import { supabase } from '../../app/lib/supabase';
import WelcomeStep from './WelcomeStep';
import ProfileStep from './ProfileStep';
import BucketListStep from './BucketListStep';
import AuthStep from './AuthStep';

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create an Animated Value to track the step smoothly
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

  // Trigger smooth pill transition whenever the step changes
  useEffect(() => {
    Animated.spring(animatedStep, {
      toValue: step,
      friction: 8,
      tension: 50,
      useNativeDriver: false, // Must be false for width/color animation
    }).start();
  }, [step]);

  const handleCreateAccount = async () => {
    try {
      setIsSubmitting(true);
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;

      const { data, error } = await supabase.auth.signUp({ 
        email: draft.email.trim(), 
        password: draft.password 
      });
      if (error) throw error;

      const response = await fetch(`${apiBase}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.user?.id,
          username: draft.username.trim(),
          personality: draft.personality.trim(),
          location: draft.location.trim(),
          hobbies: draft.hobbiesInput.split(',').map(h => h.trim()),
          bucket_list: draft.bucketList,
          onboarding_data: {} 
        }),
      });

      if (!response.ok) throw new Error('Backend sync failed');
      onComplete();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <WelcomeStep onNewUser={() => setStep(1)} onReturningUser={() => { setDraft(d => ({...d, mode: 'returning'})); setStep(3); }} />;
      case 1: return <ProfileStep {...draft} onChangeLocation={v => setDraft(d => ({...d, location: v}))} onChangePersonality={v => setDraft(d => ({...d, personality: v}))} onChangeHobbiesInput={v => setDraft(d => ({...d, hobbiesInput: v}))} onContinue={() => setStep(2)} />;
      case 2: return <BucketListStep bucketList={draft.bucketList} onUpdateBucket={(i: number, k: any, v: any) => { const n = [...draft.bucketList]; n[i] = {...n[i], [k]: v}; setDraft(d => ({...d, bucketList: n})); }} onAddManual={() => setDraft(d => ({...d, bucketList: [...d.bucketList, {title: '', category: '', deadline: ''}]}))} onContinue={() => setStep(3)} onRemoveBucket={(indexToRemove: number) => {
              setDraft(d => {
                const newList = [...d.bucketList];
                newList.splice(indexToRemove, 1);
                return { ...d, bucketList: newList };
              });
            }}/>;
      case 3: return <AuthStep mode={draft.mode} {...draft} onChangeUsername={v => setDraft(d => ({...d, username: v}))} onChangeEmail={v => setDraft(d => ({...d, email: v}))} onChangePassword={v => setDraft(d => ({...d, password: v}))} onSubmit={handleCreateAccount} submitting={isSubmitting} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" scrollEnabled={false}>
        {renderStep()}
      </ScrollView>
      
      {/* Smooth Animated Progress Pills */}
      <View style={styles.pillContainer}>
        {[0, 1, 2, 3].map((i) => {
          // Interpolate the width so it stretches dynamically
          const width = animatedStep.interpolate({
            inputRange: [i - 1, i, i + 1],
            outputRange: [12, 32, 12],
            extrapolate: 'clamp',
          });
          
          // Interpolate the color so it fades smoothly
          const backgroundColor = animatedStep.interpolate({
            inputRange: [i - 1, i, i + 1],
            outputRange: ['#E0E0E0', '#000000', '#E0E0E0'],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View key={i} style={[styles.pill, { width, backgroundColor }]} />
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingTop: 40, paddingBottom: 100, flexGrow: 1, justifyContent: 'center' },
  pillContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 40, position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(255,255,255,0.95)' },
  pill: { height: 6, borderRadius: 3 },
});