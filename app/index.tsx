import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from './lib/supabase';
import OnboardingFlow from '../components/onboarding/OnboardingFlow';

type ScreenState = 'loading' | 'onboarding' | 'tabs';

export default function IndexScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;
        setScreenState(session?.user ? 'tabs' : 'onboarding');
      } catch {
        if (mounted) setScreenState('onboarding');
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setScreenState(session?.user ? 'tabs' : 'onboarding');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (screenState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (screenState === 'onboarding') {
    return <OnboardingFlow onComplete={() => setScreenState('tabs')} />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});