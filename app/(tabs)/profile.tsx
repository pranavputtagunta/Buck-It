import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { LogOut, Calendar, Trash2, Zap, Smile } from "lucide-react-native";
import { supabase } from "../../app/lib/supabase";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#f7f5f2",
  surface: "#ffffff",
  border: "#e8e3dc",
  borderMid: "#ddd6cc",
  textPrimary: "#1a1814",
  textMuted: "#a09890",
  textLight: "#c0b9b0",
  accent: "#7a6e62",
  accentDark: "#3a342e",
  accentLight: "#ede9e3",
  available: "#34C759",
  availableLight: "#E5F9EB",
};

const DAYS = [
  { id: "Mon", label: "M" },
  { id: "Tue", label: "T" },
  { id: "Wed", label: "W" },
  { id: "Thu", label: "T" },
  { id: "Fri", label: "F" },
  { id: "Sat", label: "S" },
  { id: "Sun", label: "S" },
];

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const formatHour = (h: number) => `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`;

export default function ProfileScreen() {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingVibe, setIsUpdatingVibe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Auth & Profile State
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Loading...");
  const [personality, setPersonality] = useState("");
  const [interestsInput, setInterestsInput] = useState("");

  // ─── Fetch Data on Load ───
  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        const uid = session.user.id;
        setUserId(uid);

        // 1. Fetch Profile Info (Added personality and interests)
        const { data: profile } = await supabase
          .from("users")
          .select("display_name, personality, interests")
          .eq("id", uid)
          .single();

        if (profile) {
          setUserName(profile.display_name || "Bucket User");
          setPersonality(profile.personality || "");
          setInterestsInput(
            profile.interests ? profile.interests.join(", ") : "",
          );
        }

        // 2. Fetch Availability Matrix
        const { data: availability } = await supabase
          .from("availabilities")
          .select("available_slots")
          .eq("user_id", uid)
          .single();

        if (availability?.available_slots) {
          setSelectedSlots(new Set(availability.available_slots));
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // ─── Save Vibe (Personality & Interests) ───
  const saveVibe = async () => {
    if (!userId) return;
    setIsUpdatingVibe(true);
    try {
      const interestsArray = interestsInput
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i !== "");

      const { error } = await supabase
        .from("users")
        .update({
          personality: personality.trim(),
          interests: interestsArray,
        })
        .eq("id", userId);

      if (error) throw error;
      Alert.alert(
        "Vibe Updated",
        "Buck-it AI has adjusted your matching algorithm! ✨",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update vibe.");
    } finally {
      setIsUpdatingVibe(false);
    }
  };

  // ─── Save Availability ───
  const saveAvailability = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const slotsArray = Array.from(selectedSlots);
      const { error } = await supabase.from("availabilities").upsert({
        user_id: userId,
        available_slots: slotsArray,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      Alert.alert(
        "Schedule Locked",
        "Buck-it AI will use this matrix to auto-suggest event times!",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not sync availability.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSlot = (dayId: string, hour: number) => {
    const slotKey = `${dayId}-${hour}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  };

  const fillSocialHours = () => {
    const newSlots = new Set(selectedSlots);
    DAYS.forEach((day) => {
      if (day.id === "Sat" || day.id === "Sun") {
        for (let h = 9; h <= 22; h++) newSlots.add(`${day.id}-${h}`);
      } else {
        for (let h = 17; h <= 22; h++) newSlots.add(`${day.id}-${h}`);
      }
    });
    setSelectedSlots(newSlots);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile Info */}
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>
              {userName.substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userHandle}>
            @{userName.toLowerCase().replace(/\s+/g, "_")}
          </Text>
        </View>

        {/* ── NEW: Your Vibe Section ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Smile
                color={C.accentDark}
                size={18}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.cardTitle}>Your Vibe</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Edit your personality and interests for the AI.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PERSONALITY</Text>
            <TextInput
              style={styles.textInput}
              value={personality}
              onChangeText={setPersonality}
              placeholder="Adventurous, creative..."
              placeholderTextColor={C.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>INTERESTS (COMMA SEPARATED)</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 60 }]}
              value={interestsInput}
              onChangeText={setInterestsInput}
              multiline
              placeholder="Hiking, coding, surfing..."
              placeholderTextColor={C.textLight}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: C.accentDark }]}
            onPress={saveVibe}
            disabled={isUpdatingVibe}
          >
            {isUpdatingVibe ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Update Vibe</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Availability Matrix */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Calendar
                color={C.accentDark}
                size={18}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.cardTitle}>Availability Matrix</Text>
            </View>
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={fillSocialHours}
            >
              <Zap color={C.accentDark} size={14} style={{ marginRight: 4 }} />
              <Text style={styles.quickActionText}>Nights & Weekends</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: "#FFF0F0" }]}
              onPress={() => setSelectedSlots(new Set())}
            >
              <Trash2 color="#FF3B30" size={14} style={{ marginRight: 4 }} />
              <Text style={[styles.quickActionText, { color: "#FF3B30" }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridWrapper}>
            <View style={styles.gridRowHeader}>
              <View style={styles.timeLabelCell} />
              {DAYS.map((day, i) => (
                <View key={i} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{day.label}</Text>
                </View>
              ))}
            </View>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.gridRow}>
                <View style={styles.timeLabelCell}>
                  <Text style={styles.timeLabelText}>{formatHour(hour)}</Text>
                </View>
                {DAYS.map((day) => {
                  const slotKey = `${day.id}-${hour}`;
                  return (
                    <TouchableOpacity
                      key={slotKey}
                      activeOpacity={0.7}
                      onPress={() => toggleSlot(day.id, hour)}
                      style={[
                        styles.gridCell,
                        selectedSlots.has(slotKey)
                          ? styles.gridCellActive
                          : styles.gridCellInactive,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveAvailability}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Matrix</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>SUPPORT</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => supabase.auth.signOut()}
            >
              <View style={styles.settingsRowLeft}>
                <LogOut size={20} color="#FF3B30" />
                <Text style={[styles.settingsRowTitle, { color: "#FF3B30" }]}>
                  Log Out
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 60 },
  header: { alignItems: "center", marginBottom: 30, paddingTop: 20 },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.accentLight,
    borderWidth: 2,
    borderColor: C.borderMid,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarTextLarge: { fontSize: 28, fontWeight: "800", color: C.accentDark },
  userName: { fontSize: 24, fontWeight: "800", color: C.textPrimary },
  userHandle: {
    fontSize: 15,
    color: C.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: { marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: C.textPrimary },
  cardSubtitle: { fontSize: 14, color: C.textMuted, marginTop: 4 },

  // Vibe Input Styles
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: C.textPrimary,
    borderWidth: 1,
    borderColor: C.borderMid,
  },

  quickActionsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.borderMid,
    paddingVertical: 10,
    borderRadius: 12,
  },
  quickActionText: { fontSize: 13, fontWeight: "700", color: C.accentDark },
  gridWrapper: {
    borderWidth: 1,
    borderColor: C.borderMid,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: C.bg,
  },
  gridRowHeader: {
    flexDirection: "row",
    height: 36,
    backgroundColor: C.surface,
  },
  gridRow: { flexDirection: "row", height: 32 },
  timeLabelCell: {
    width: 50,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 8,
    borderRightWidth: 1,
    borderColor: C.borderMid,
    backgroundColor: C.surface,
  },
  timeLabelText: { fontSize: 10, fontWeight: "600", color: C.textMuted },
  dayHeaderCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: C.borderMid,
    backgroundColor: C.surface,
  },
  dayHeaderText: { fontSize: 12, fontWeight: "800", color: C.textPrimary },
  gridCell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.borderMid,
  },
  gridCellInactive: { backgroundColor: C.surface },
  gridCellActive: { backgroundColor: C.available },
  saveBtn: {
    backgroundColor: "#000",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  settingsGroup: { marginBottom: 24 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1,
    marginLeft: 16,
    marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  settingsRowLeft: { flexDirection: "row", alignItems: "center" },
  settingsRowTitle: { fontSize: 16, fontWeight: "600", marginLeft: 12 },
});
