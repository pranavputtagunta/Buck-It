import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Settings, Bell, Lock, CircleHelp, LogOut, Sparkles, Calendar, Trash2, Zap } from 'lucide-react-native';
import { supabase } from '../../app/lib/supabase';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#f7f5f2', surface: '#ffffff', border: '#e8e3dc', borderMid: '#ddd6cc',
  textPrimary: '#1a1814', textMuted: '#a09890', textLight: '#c0b9b0',
  accent: '#7a6e62', accentDark: '#3a342e', accentLight: '#ede9e3',
  available: '#34C759', 
  availableLight: '#E5F9EB', 
};

// ─── Matrix Config ────────────────────────────────────────────────────────────
const DAYS = [
  { id: 'Mon', label: 'M' },
  { id: 'Tue', label: 'T' },
  { id: 'Wed', label: 'W' },
  { id: 'Thu', label: 'T' },
  { id: 'Fri', label: 'F' },
  { id: 'Sat', label: 'S' },
  { id: 'Sun', label: 'S' },
];

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

const formatHour = (h: number) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12} ${ampm}`;
};

export default function ProfileScreen() {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth & Profile State
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Loading...');

  // ─── Fetch Data on Load ───
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const uid = session.user.id;
        setUserId(uid);

        // 1. Fetch Profile Name
        const { data: profile } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', uid)
          .single();
          
        if (profile?.display_name) {
          setUserName(profile.display_name);
        } else {
          setUserName('Bucket User');
        }

        // 2. Fetch Availability Matrix
        const { data: availability } = await supabase
          .from('availabilities')
          .select('available_slots')
          .eq('user_id', uid)
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

  // ─── Grid Logic ───
  const toggleSlot = (dayId: string, hour: number) => {
    const slotKey = `${dayId}-${hour}`;
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  };

  const fillSocialHours = () => {
    const newSlots = new Set(selectedSlots);
    DAYS.forEach(day => {
      if (day.id === 'Sat' || day.id === 'Sun') {
        for (let h = 9; h <= 22; h++) newSlots.add(`${day.id}-${h}`);
      } else {
        for (let h = 17; h <= 22; h++) newSlots.add(`${day.id}-${h}`);
      }
    });
    setSelectedSlots(newSlots);
  };

  const clearAll = () => {
    setSelectedSlots(new Set());
  };

  // ─── Save to Supabase ───
  const saveAvailability = async () => {
    if (!userId) return;
    setIsSaving(true);
    
    try {
      const slotsArray = Array.from(selectedSlots);
      
      // Upsert: Updates if row exists, inserts if it doesn't
      const { error } = await supabase
        .from('availabilities')
        .upsert({ 
          user_id: userId, 
          available_slots: slotsArray,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      Alert.alert("Schedule Locked", "Buck-it AI will use this matrix to auto-suggest event times! ✨");

    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Could not sync availability.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const SettingsRow = ({ icon, title, isDestructive = false, onPress }: any) => (
    <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.settingsRowLeft}>
        {icon}
        <Text style={[styles.settingsRowTitle, isDestructive && { color: '#FF3B30' }]}>{title}</Text>
      </View>
      <ChevronRight color={C.textLight} size={20} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header Profile Info */}
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{userName.substring(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userHandle}>@{userName.toLowerCase().replace(/\s+/g, '_')}</Text>
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* AI Availability Matrix */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar color={C.accentDark} size={18} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Availability Matrix</Text>
            </View>
            <Text style={styles.cardSubtitle}>Tap the hourly blocks when you're generally free.</Text>
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={fillSocialHours}>
              <Zap color={C.accentDark} size={14} style={{ marginRight: 4 }} />
              <Text style={styles.quickActionText}>Nights & Weekends</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#FFF0F0', borderColor: '#FFD6D6' }]} onPress={clearAll}>
              <Trash2 color="#FF3B30" size={14} style={{ marginRight: 4 }} />
              <Text style={[styles.quickActionText, { color: '#FF3B30' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* THE GRID */}
          <View style={styles.gridWrapper}>
            <View style={styles.gridRowHeader}>
              <View style={styles.timeLabelCell} />
              {DAYS.map((day, i) => (
                <View key={`header-${i}`} style={styles.dayHeaderCell}>
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
                  const isSelected = selectedSlots.has(slotKey);
                  return (
                    <TouchableOpacity
                      key={slotKey}
                      activeOpacity={0.7}
                      onPress={() => toggleSlot(day.id, hour)}
                      style={[
                        styles.gridCell,
                        isSelected ? styles.gridCellActive : styles.gridCellInactive,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveAvailability} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Matrix</Text>}
          </TouchableOpacity>
        </View>

        {/* Standard Settings */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>ACCOUNT</Text>
          <View style={styles.settingsCard}>
            <SettingsRow icon={<Settings size={20} color={C.textPrimary} />} title="Preferences" />
            <View style={styles.divider} />
            <SettingsRow icon={<Bell size={20} color={C.textPrimary} />} title="Notifications" />
            <View style={styles.divider} />
            <SettingsRow icon={<Lock size={20} color={C.textPrimary} />} title="Privacy & Security" />
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupLabel}>SUPPORT</Text>
          <View style={styles.settingsCard}>
            <SettingsRow icon={<CircleHelp size={20} color={C.textPrimary} />} title="Help Center" />
            <View style={styles.divider} />
            <SettingsRow icon={<LogOut size={20} color="#FF3B30" />} title="Log Out" isDestructive onPress={handleLogout} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const ChevronRight = ({ color, size }: any) => <Text style={{ color, fontSize: size }}>›</Text>;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 30, paddingTop: 20 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accentLight, borderWidth: 2, borderColor: C.borderMid, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTextLarge: { fontSize: 28, fontWeight: '800', color: C.accentDark, letterSpacing: 1 },
  userName: { fontSize: 24, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  userHandle: { fontSize: 15, color: C.textMuted, marginTop: 2, marginBottom: 16 },
  editProfileBtn: { backgroundColor: C.surface, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  editProfileText: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  card: { backgroundColor: C.surface, borderRadius: 24, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  cardHeader: { marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  cardSubtitle: { fontSize: 14, color: C.textMuted, marginTop: 6, lineHeight: 20 },
  quickActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderMid, paddingVertical: 10, borderRadius: 12 },
  quickActionText: { fontSize: 13, fontWeight: '700', color: C.accentDark },
  gridWrapper: { borderWidth: 1, borderColor: C.borderMid, borderRadius: 12, overflow: 'hidden', backgroundColor: C.bg },
  gridRowHeader: { flexDirection: 'row', height: 36, backgroundColor: C.surface },
  gridRow: { flexDirection: 'row', height: 32 },
  timeLabelCell: { width: 50, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8, borderRightWidth: 1, borderColor: C.borderMid, backgroundColor: C.surface },
  timeLabelText: { fontSize: 10, fontWeight: '600', color: C.textMuted },
  dayHeaderCell: { flex: 1, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderRightWidth: 1, borderColor: C.borderMid, backgroundColor: C.surface },
  dayHeaderText: { fontSize: 12, fontWeight: '800', color: C.textPrimary },
  gridCell: { flex: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.borderMid },
  gridCellInactive: { backgroundColor: C.surface },
  gridCellActive: { backgroundColor: C.available },
  saveBtn: { backgroundColor: '#000', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  settingsGroup: { marginBottom: 24 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 1, marginLeft: 16, marginBottom: 8 },
  settingsCard: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingsRowTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary, marginLeft: 12 },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 48 },
});