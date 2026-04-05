import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../../app/lib/supabase';
import { onboardUser } from '../../app/lib/onboardApi';
import { createUser } from '../../app/lib/usersApi';
import WelcomeStep from './WelcomeStep';
import ProfileStep from './ProfileStep';
import BucketListStep from './BucketListStep';
import AuthStep from './AuthStep';
import type {
  BucketDraftItem,
  BucketListSource,
} from '../../app/types/onboarding';
import { createOrUpdateProfile } from '../../app/lib/profileApi';

type UserMode = 'new' | 'returning' | null;

type OnboardingDraft = {
  mode: UserMode;
  personality: string;
  hobbies: string[];
  hobbiesInput: string;
  bucketList: BucketDraftItem[];
  bucketListSource: BucketListSource;
  username: string;
  email: string;
  password: string;
  location?: string;
};

function parseHobbies(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferCategoryFromTitle(title: string): string {
  const lower = title.toLowerCase();

  if (
    lower.includes('hike') ||
    lower.includes('travel') ||
    lower.includes('trip') ||
    lower.includes('surf') ||
    lower.includes('camp')
  ) {
    return 'Travel & Adventure';
  }

  if (
    lower.includes('build') ||
    lower.includes('launch') ||
    lower.includes('project') ||
    lower.includes('speak')
  ) {
    return 'Career & Skills';
  }

  if (
    lower.includes('run') ||
    lower.includes('gym') ||
    lower.includes('fitness') ||
    lower.includes('workout')
  ) {
    return 'Health & Fitness';
  }

  return 'Personal Growth';
}

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [draft, setDraft] = useState<OnboardingDraft>({
    mode: null,
    personality: '',
    hobbies: [],
    hobbiesInput: '',
    bucketList: [],
    bucketListSource: 'manual',
    username: '',
    email: '',
    password: '',
    location: '',
  });

  const saveHobbiesAndContinue = () => {
    const hobbies = parseHobbies(draft.hobbiesInput);

    setDraft((prev) => ({
      ...prev,
      hobbies,
    }));

    setStep(2);
  };

  const addManualBucket = () => {
    setDraft((prev) => ({
      ...prev,
      bucketList: [
        ...prev.bucketList,
        {
          title: '',
          category: '',
          deadline: '',
        },
      ],
      bucketListSource:
        prev.bucketListSource === 'ai' || prev.bucketList.length > 0
          ? 'mixed'
          : 'manual',
    }));
  };

  const updateBucket = (
    index: number,
    key: keyof BucketDraftItem,
    value: string
  ) => {
    setDraft((prev) => {
      const next = [...prev.bucketList];
      next[index] = {
        ...next[index],
        [key]: value,
      };
      return {
        ...prev,
        bucketList: next,
      };
    });
  };

  const handleGenerateWithAI = async () => {
    try {
      setIsGeneratingAI(true);

      const hobbies = parseHobbies(draft.hobbiesInput);

      const userAnswers = [
        `Personality: ${draft.personality || 'Not provided'}`,
        `Hobbies: ${hobbies.join(', ') || 'Not provided'}`,
        `Goal style: ambitious, social, realistic, actionable`,
      ].join('\n');

      const response = await onboardUser({
        user_id: 'temp-user',
        user_answers: userAnswers,
      });

      const mappedGoals: BucketDraftItem[] = response.goals.map((goal) => ({
        title: goal.title,
        deadline: goal.deadline,
        category: inferCategoryFromTitle(goal.title),
      }));

      setDraft((prev) => ({
        ...prev,
        hobbies,
        bucketList: mappedGoals,
        bucketListSource: prev.bucketList.length > 0 ? 'mixed' : 'ai',
      }));
    } catch (err: any) {
      Alert.alert('AI generation failed', err.message ?? 'Could not generate goals.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

const handleCreateAccount = async () => {
  try {
    setIsSubmittingAuth(true);

    const hobbies = parseHobbies(draft.hobbiesInput);

    const { data, error } = await supabase.auth.signUp({
      email: draft.email.trim(),
      password: draft.password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No auth user returned from signUp.');

    const userId = data.user.id;

    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBase) {
      throw new Error('EXPO_PUBLIC_API_BASE_URL is not set');
    }

    // FORCE create public.users row directly
    const userRes = await fetch(`${apiBase}/api/users/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userId,
        display_name: draft.username.trim(),
      }),
    });

    const userJson = await userRes.json();
    console.log('POST /api/users/ response:', userJson);

    if (!userRes.ok) {
      throw new Error(userJson?.detail || 'Failed to create public.users row');
    }

    // then save onboarding/profile data
    const profileRes = await fetch(`${apiBase}/api/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userId,
        username: draft.username.trim(),
        personality: draft.personality.trim(),
        hobbies,
        location: draft.location?.trim() || '',
        bucket_list: draft.bucketList,
        onboarding_data: {
          personality: draft.personality.trim(),
          hobbies,
          location: draft.location?.trim() || '',
          bucketListDraft: draft.bucketList,
          bucketListSource: draft.bucketListSource,
        },
      }),
    });

    const profileJson = await profileRes.json();
    console.log('POST /api/users/profile response:', profileJson);

    if (!profileRes.ok) {
      throw new Error(profileJson?.detail || 'Failed to create onboarding/profile data');
    }

    onComplete();
  } catch (err: any) {
    console.error('handleCreateAccount failed:', err);
    Alert.alert('Sign up failed', err?.message || 'Something went wrong.');
  } finally {
    setIsSubmittingAuth(false);
  }
};
  const handleReturningUserSignIn = async () => {
    try {
      setIsSubmittingAuth(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: draft.email,
        password: draft.password,
      });

      if (error) throw error;

      onComplete();
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message ?? 'Something went wrong.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const canContinueProfile =
    draft.personality.trim().length > 0 && draft.hobbiesInput.trim().length > 0;

  const canContinueBucketList = draft.bucketList.length > 0;

  const canCreateAccount =
    draft.username.trim().length > 0 &&
    draft.email.trim().length > 0 &&
    draft.password.trim().length >= 6;

  const canSignIn =
    draft.email.trim().length > 0 && draft.password.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {step === 0 && (
          <WelcomeStep
            onNewUser={() => {
              setDraft((prev) => ({ ...prev, mode: 'new' }));
              setStep(1);
            }}
            onReturningUser={() => {
              setDraft((prev) => ({ ...prev, mode: 'returning' }));
              setStep(3);
            }}
          />
        )}

        {step === 1 && (
            <ProfileStep
            personality={draft.personality}
            hobbiesInput={draft.hobbiesInput}
            location={draft.location}
            onChangePersonality={(value) =>
                setDraft((prev) => ({ ...prev, personality: value }))
            }
            onChangeHobbiesInput={(value) =>
                setDraft((prev) => ({ ...prev, hobbiesInput: value }))
            }
            onChangeLocation={(value) =>
                setDraft((prev) => ({ ...prev, location: value }))
            }
            onContinue={saveHobbiesAndContinue}
            disabled={!canContinueProfile}
            />
        )}

        {step === 2 && (
          <BucketListStep
            bucketList={draft.bucketList}
            onGenerateWithAI={handleGenerateWithAI}
            onAddManual={addManualBucket}
            onUpdateBucket={updateBucket}   
            onContinue={() => setStep(3)}
            generating={isGeneratingAI}
            continueDisabled={!canContinueBucketList}
          />
        )}

        {step === 3 && draft.mode && (
          <AuthStep
            mode={draft.mode}
            username={draft.username}
            email={draft.email}
            password={draft.password}
            onChangeUsername={(value) =>
              setDraft((prev) => ({ ...prev, username: value }))
            }
            onChangeEmail={(value) =>
              setDraft((prev) => ({ ...prev, email: value }))
            }
            onChangePassword={(value) =>
              setDraft((prev) => ({ ...prev, password: value }))
            }
            onSubmit={
              draft.mode === 'returning'
                ? handleReturningUserSignIn
                : handleCreateAccount
            }
            submitting={isSubmittingAuth}
            disabled={
              isSubmittingAuth ||
              (draft.mode === 'returning' ? !canSignIn : !canCreateAccount)
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 60,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
});