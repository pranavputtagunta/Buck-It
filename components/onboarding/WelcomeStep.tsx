import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { ArrowRight, Sparkles } from "lucide-react-native";
import { C } from "./theme";

export default function WelcomeStep({ onNewUser, onReturningUser }: any) {
  const headerAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(130, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(card1Anim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(card2Anim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, [card1Anim, card2Anim, headerAnim]);

  const fadeUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, fadeUp(headerAnim)]}>
        <View style={styles.badge}>
          <Sparkles color={C.accent} size={13} />
          <Text style={styles.badgeText}>BUCK-IT</Text>
        </View>
        <Text style={styles.title}>Live your{"\n"}best life.</Text>
        <Text style={styles.subtitle}>
          Turn &quot;one day&quot; into today. Shape your vibe and start your
          list.
        </Text>
      </Animated.View>

      {/* Primary card — Start new */}
      <Animated.View style={fadeUp(card1Anim)}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            styles.cardPrimary,
            pressed && styles.pressed,
          ]}
          onPress={onNewUser}
        >
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardLabelLight}>NEW USER</Text>
            <Text style={styles.cardTitleLight}>Start New Journey</Text>
            <Text style={styles.cardSubLight}>
              Build your profile and generate your list with AI.
            </Text>
          </View>
          <View style={styles.arrowWrapLight}>
            <ArrowRight color={C.accentDark} size={18} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Secondary card — Returning */}
      <Animated.View style={fadeUp(card2Anim)}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            styles.cardSecondary,
            pressed && styles.pressed,
          ]}
          onPress={onReturningUser}
        >
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardLabelDark}>RETURNING</Text>
            <Text style={styles.cardTitleDark}>Welcome Back</Text>
            <Text style={styles.cardSubDark}>
              Sign in to access your existing active buckets.
            </Text>
          </View>
          <View style={styles.arrowWrapDark}>
            <ArrowRight color={C.accent} size={18} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },

  header: { marginBottom: 32 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.accentLight,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.borderMid,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    marginLeft: 6,
    letterSpacing: 1.2,
  },

  title: {
    fontSize: 50,
    fontWeight: "700",
    letterSpacing: -2,
    lineHeight: 52,
    color: C.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: C.textMuted,
    marginTop: 12,
    lineHeight: 24,
    fontWeight: "400",
  },

  card: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  cardPrimary: {
    backgroundColor: C.accentDark,
    borderWidth: 1,
    borderColor: C.accentDark,
  },
  cardSecondary: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },

  cardTextWrap: { flex: 1, marginRight: 12 },

  cardLabelLight: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 6,
  },
  cardTitleLight: {
    fontSize: 19,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  cardSubLight: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 19,
  },

  cardLabelDark: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: C.textLight,
    marginBottom: 6,
  },
  cardTitleDark: {
    fontSize: 19,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  cardSubDark: { fontSize: 13, color: C.textMuted, lineHeight: 19 },

  arrowWrapLight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowWrapDark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accentLight,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
});
