import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated, Dimensions, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get("window").height;
const C = { bg: "#f7f5f2", surface: "#ffffff", border: "#e8e3dc", textPrimary: "#1a1814", textMuted: "#a09890", accentDark: "#3a342e" };

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  onSuccess: (newEvent: any) => void;
}

export default function CreateEventModal({ visible, onClose, userId, onSuccess }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!title.trim() || !location.trim() || !userId) return;
    setIsSubmitting(true);

    try {
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiBase}/api/buckets/discover/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title: title.trim(),
          location_name: location.trim(),
          deadline: deadline.trim() || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create event");
      
      const newEvent = await response.json();
      
      // Format to match EventItem in HomeFeed
      onSuccess({
        id: newEvent.id,
        user: "You",
        locationName: newEvent.location_name,
        coords: { latitude: newEvent.latitude || 32.715, longitude: newEvent.longitude || -117.16 },
        title: newEvent.title,
        image: newEvent.image,
        deadline: newEvent.deadline || "Join anytime",
        tags: newEvent.tags || [],
        category: newEvent.tags?.[0] || "General",
        time_slots: [],
        _searchString: `${newEvent.title} ${(newEvent.tags || []).join(" ")}`
      });

      setTitle(''); setLocation(''); setDeadline('');
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragHandleWrap}><View style={styles.dragHandle} /></View>
            <Text style={styles.sheetTitle}>Create Discover Event</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>What's the plan?</Text>
              <TextInput style={styles.input} placeholder="e.g. Morning Hike at Torrey Pines" value={title} onChangeText={setTitle} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Where?</Text>
              <TextInput style={styles.input} placeholder="e.g. La Jolla, CA" value={location} onChangeText={setLocation} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>When? (Optional)</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={deadline} onChangeText={setDeadline} />
            </View>

            <TouchableOpacity style={[styles.submitBtn, (!title || !location) && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={!title || !location || isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Event ✨</Text>}
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(26,24,20,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 50 },
  dragHandleWrap: { alignItems: "center", marginBottom: 16 },
  dragHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 99 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: C.textPrimary, marginBottom: 24, textAlign: 'center' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: C.textPrimary, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: C.bg, borderRadius: 12, padding: 16, fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
  submitBtn: { backgroundColor: C.accentDark, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 12 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});