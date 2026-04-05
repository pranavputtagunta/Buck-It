import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Edit, Search } from 'lucide-react-native';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          '#f7f5f2',
  surface:     '#ffffff',
  border:      '#e8e3dc',
  borderMid:   '#ddd6cc',
  textPrimary: '#1a1814',
  textMuted:   '#a09890',
  textLight:   '#c0b9b0',
  accent:      '#7a6e62',
  accentDark:  '#3a342e',
  accentLight: '#ede9e3',
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_CHATS = [
  { id: '1', title: 'Sunset Kayaking 🌅', last: "I'll bring the speaker!", user: 'Alex',   time: '2m ago',  unread: 2 },
  { id: '2', title: 'Torrey Pines Hike',  last: 'Trailhead at 8am?',       user: 'Sam',    time: '1h ago',  unread: 0 },
  { id: '3', title: 'Bouldering Crew',    last: 'Anyone free Saturday?',   user: 'Jordan', time: 'Yesterday', unread: 1 },
];

// ─── Avatar initials helper ───────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.iconBtn}
        >
          <ChevronLeft color={C.textPrimary} size={28} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>INBOX</Text>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.iconBtn}
        >
          <Edit color={C.accent} size={22} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchInner}>
          <Search color={C.textLight} size={15} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor={C.textLight}
          />
        </View>
      </View>

      {/* Chat list */}
      <FlatList
        data={MOCK_CHATS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Avatar name={item.user} />

            <View style={styles.rowContent}>
              <View style={styles.rowTop}>
                <Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <View style={styles.rowBottom}>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  <Text style={styles.chatUser}>{item.user}: </Text>
                  {item.last}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: C.bg,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: C.textLight,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.4,
  },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '400',
  },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 70 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.accentLight,
    borderWidth: 1,
    borderColor: C.borderMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.accent,
    letterSpacing: 0.3,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 11,
    color: C.textLight,
    fontWeight: '500',
  },
  chatUser: {
    fontWeight: '600',
    color: C.accent,
  },
  chatPreview: {
    fontSize: 13,
    color: C.textMuted,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: C.accentDark,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});