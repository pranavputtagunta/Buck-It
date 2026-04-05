import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { ArrowRight, Sparkles } from 'lucide-react-native';

export default function WelcomeStep({ onNewUser, onReturningUser }: any) {
  // Create animated values for the stagger effect
  const headerAnim = useRef(new Animated.Value(0)).current;
  const primaryCardAnim = useRef(new Animated.Value(0)).current;
  const secondaryCardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fire animations in a staggered sequence
    Animated.stagger(150, [
      Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(primaryCardAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(secondaryCardAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // Helper function to map 0->1 to Slide Up & Fade
  const getAnimatedStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{
      translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [30, 0], // Starts 30px down, slides to 0
      })
    }]
  });

  return (
    <View style={styles.container}>
      
      {/* Header Section */}
      <Animated.View style={[styles.headerSection, getAnimatedStyle(headerAnim)]}>
        <View style={styles.logoBadge}>
          <Sparkles color="#000" size={14} />
          <Text style={styles.logoText}>BUCKET</Text>
        </View>
        <Text style={styles.title}>Live your best life.</Text>
        <Text style={styles.subtitle}>Turn "one day" into today. Shape your vibe and start your list.</Text>
      </Animated.View>

      {/* Primary Card */}
      <Animated.View style={getAnimatedStyle(primaryCardAnim)}>
        <Pressable 
          style={({ pressed }) => [styles.card, styles.cardBlack, pressed && styles.pressed]} 
          onPress={onNewUser}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitleWhite}>Start New Journey</Text>
            <Text style={styles.cardSubWhite}>Build your profile and generate your list with AI.</Text>
          </View>
          <ArrowRight color="#fff" size={24} />
        </Pressable>
      </Animated.View>

      {/* Secondary Card */}
      <Animated.View style={getAnimatedStyle(secondaryCardAnim)}>
        <Pressable 
          style={({ pressed }) => [styles.card, styles.cardGray, pressed && styles.pressed]} 
          onPress={onReturningUser}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitleBlack}>Welcome Back</Text>
            <Text style={styles.cardSubBlack}>Sign in to access your existing active buckets.</Text>
          </View>
          <ArrowRight color="#000" size={24} />
        </Pressable>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  headerSection: { marginBottom: 30 },
  logoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  logoText: { fontSize: 12, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },
  title: { fontSize: 48, fontWeight: '900', letterSpacing: -2, lineHeight: 48, color: '#000' },
  subtitle: { fontSize: 17, color: '#666', marginTop: 12, lineHeight: 24 },
  
  card: { borderRadius: 24, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  cardBlack: { backgroundColor: '#000', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
  cardGray: { backgroundColor: '#F8F8F8', borderWidth: 1, borderColor: '#EEE' },
  
  cardTitleWhite: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  cardSubWhite: { color: '#AAA', fontSize: 14, lineHeight: 20 },
  cardTitleBlack: { color: '#000', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  cardSubBlack: { color: '#666', fontSize: 14, lineHeight: 20 },
  
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 }
});