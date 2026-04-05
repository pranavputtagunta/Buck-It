import React, { useState, useEffect, useRef } from "react";
import { Alert, View, StyleSheet, ScrollView, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../app/lib/supabase";
import { C } from "./theme";
import WelcomeStep from "./WelcomeStep";
import ProfileStep from "./ProfileStep";
import BucketListStep from "./BucketListStep";
import AuthStep from "./AuthStep";

export default function OnboardingFlow({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingGoals, setIsGeneratingGoals] = useState(false);
  const animatedStep = useRef(new Animated.Value(0)).current;

  const [draft, setDraft] = useState({
    mode: "new" as "new" | "returning",
    username: "",
    email: "",
    password: "",
    personality: "",
    hobbiesInput: "",
    location: "",
    bucketList: [] as {
      title: string;
      category?: string;
      deadline: string;
      source: "ai" | "manual";
    }[],
  });

  useEffect(() => {
    Animated.spring(animatedStep, {
      toValue: step,
      friction: 8,
      tension: 50,
      useNativeDriver: false,
    }).start();
  }, [animatedStep, step]);

  const handleSuggestItems = async () => {
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBase) {
      Alert.alert(
        "Missing API URL",
        "EXPO_PUBLIC_API_BASE_URL is not configured.",
      );
      return;
    }

    const userAnswers = [
      draft.personality.trim() && `Personality: ${draft.personality.trim()}`,
      draft.hobbiesInput.trim() && `Hobbies: ${draft.hobbiesInput.trim()}`,
      draft.location.trim() && `Location: ${draft.location.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!userAnswers) {
      Alert.alert(
        "Need more context",
        "Add your vibe details first so AI can suggest items.",
      );
      return;
    }

    try {
      setIsGeneratingGoals(true);

      const response = await fetch(`${apiBase}/api/onboard/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "onboarding-preauth",
          user_answers: userAnswers,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || "Failed to suggest items");
      }

      const goals = Array.isArray(payload?.goals) ? payload.goals : [];
      if (!goals.length) {
        throw new Error("No goals returned");
      }

      const aiItems = goals.map((g: any) => ({
        title: typeof g?.title === "string" ? g.title : "",
        category: "",
        deadline: typeof g?.deadline === "string" ? g.deadline : "",
        source: "ai" as const,
      }));

      const manualItems = draft.bucketList.filter(
        (item) => item.source === "manual",
      );
      setDraft((d) => ({ ...d, bucketList: [...aiItems, ...manualItems] }));
    } catch (err: any) {
      Alert.alert(
        "Suggestion failed",
        err?.message || "Could not generate items.",
      );
    } finally {
      setIsGeneratingGoals(false);
    }
  };

  const handleContinueToAccount = () => {
    const validItems = draft.bucketList.filter((item) => item.title.trim());
    if (!validItems.length) {
      Alert.alert(
        "Add at least one goal",
        "Use Suggest Items or Add Manually before continuing.",
      );
      return;
    }
    setStep(3);
  };

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
      Alert.alert("Sign In Failed", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── LOGIC: New User ───
  const handleCreateAccount = async () => {
    try {
      setIsSubmitting(true);
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (!apiBase)
        throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured");

      // 1. Supabase Auth Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: draft.email.trim(),
        password: draft.password,
      });

      if (error) throw error;
      if (!data.user?.id) throw new Error("No user returned from sign up");

      const userId = data.user.id;

      // 2. Create public user profile row
      const createUserResponse = await fetch(`${apiBase}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          display_name: draft.username.trim(),
          location: draft.location.trim() || "San Diego",
        }),
      });

      if (!createUserResponse.ok) {
        const err = await createUserResponse.json().catch(() => ({}));
        throw new Error(err?.detail || "Failed to create user profile");
      }

      const validGoals = draft.bucketList
        .map((item) => ({
          ...item,
          title: item.title.trim(),
          deadline: item.deadline?.trim() || null,
        }))
        .filter((item) => item.title);

      // 3. Persist all onboarding list items in one bulk call
      if (validGoals.length) {
        const acceptedGoals = validGoals
          .filter((item) => item.source === "ai")
          .map((item) => ({ title: item.title, deadline: item.deadline }));

        const customGoals = validGoals
          .filter((item) => item.source !== "ai")
          .map((item) => ({ title: item.title, deadline: item.deadline }));

        const bulkResponse = await fetch(`${apiBase}/api/bucket-list/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            accepted_goals: acceptedGoals,
            custom_goals: customGoals,
          }),
        });

        if (!bulkResponse.ok) {
          const err = await bulkResponse.json().catch(() => ({}));
          throw new Error(err?.detail || "Failed to save onboarding goals");
        }
      }

      onComplete();
    } catch (err: any) {
      Alert.alert("Sign Up Error", err.message);
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
              setDraft((d) => ({ ...d, mode: "new" }));
              setStep(1);
            }}
            onReturningUser={() => {
              setDraft((d) => ({ ...d, mode: "returning" }));
              setStep(3); // Skip Vibe/Bucket steps for returning users
            }}
          />
        );
      case 1:
        return (
          <ProfileStep
            {...draft}
            onChangeLocation={(v: string) =>
              setDraft((d) => ({ ...d, location: v }))
            }
            onChangePersonality={(v: string) =>
              setDraft((d) => ({ ...d, personality: v }))
            }
            onChangeHobbiesInput={(v: string) =>
              setDraft((d) => ({ ...d, hobbiesInput: v }))
            }
            onContinue={() => setStep(2)}
          />
        );
      case 2:
        return (
          <BucketListStep
            bucketList={draft.bucketList}
            onGenerateWithAI={handleSuggestItems}
            generating={isGeneratingGoals}
            onUpdateBucket={(i: number, k: any, v: any) => {
              const n = [...draft.bucketList];
              n[i] = { ...n[i], [k]: v };
              setDraft((d) => ({ ...d, bucketList: n }));
            }}
            onAddManual={() =>
              setDraft((d) => ({
                ...d,
                bucketList: [
                  ...d.bucketList,
                  { title: "", category: "", deadline: "", source: "manual" },
                ],
              }))
            }
            onContinue={handleContinueToAccount}
            onRemoveBucket={(indexToRemove: number) => {
              setDraft((d) => {
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
            {...draft}
            onChangeUsername={(v: string) =>
              setDraft((d) => ({ ...d, username: v }))
            }
            onChangeEmail={(v: string) => setDraft((d) => ({ ...d, email: v }))}
            onChangePassword={(v: string) =>
              setDraft((d) => ({ ...d, password: v }))
            }
            // Switch function based on mode
            onSubmit={draft.mode === "new" ? handleCreateAccount : handleSignIn}
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
        contentContainerStyle={[
          styles.scrollContent,
          step === 2 && styles.scrollContentStep3,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={step === 2}
      >
        {renderStep()}
      </ScrollView>

      {/* Progress pills */}
      <View style={styles.pillRow}>
        {[0, 1, 2, 3].map((i) => {
          const width = animatedStep.interpolate({
            inputRange: [i - 1, i, i + 1],
            outputRange: [8, 28, 8],
            extrapolate: "clamp",
          });
          const backgroundColor = animatedStep.interpolate({
            inputRange: [i - 1, i, i + 1],
            outputRange: [C.border, C.accentDark, C.border],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={i}
              style={[styles.pill, { width, backgroundColor }]}
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scrollContent: {
    padding: 28,
    paddingTop: 44,
    paddingBottom: 110,
    flexGrow: 1,
    justifyContent: "center",
  },
  scrollContentStep3: {
    justifyContent: "flex-start",
    paddingBottom: 180,
  },
  pillRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingBottom: 40,
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: C.bg,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  pill: { height: 5, borderRadius: 99 },
});
