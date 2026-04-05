import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Edit, Search, Send, Sparkles, Calendar, Map, Info } from 'lucide-react-native';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#f7f5f2', surface: '#ffffff', border: '#e8e3dc', borderMid: '#ddd6cc',
  textPrimary: '#1a1814', textMuted: '#a09890', textLight: '#c0b9b0',
  accent: '#7a6e62', accentDark: '#3a342e', accentLight: '#ede9e3', aiBubble: '#f0efe9',
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_CHATS = [
  { id: '1', title: 'Sunset Kayaking 🌅', last: "I'll bring the speaker!", user: 'Alex', time: '2m ago', unread: 2 },
  { id: '2', title: 'Torrey Pines Hike', last: 'Trailhead at 8am?', user: 'Sam', time: '1h ago', unread: 0 },
  { id: '3', title: 'Bouldering Crew', last: 'Anyone free Saturday?', user: 'Jordan', time: 'Yesterday', unread: 1 },
];

const INITIAL_MESSAGES = [
  { id: '1', type: 'user', sender: 'Alex', text: 'Hey everyone! Ready for this?', isMe: false, time: '10:00 AM' },
  { id: 'ai-1', type: 'ai', text: "Looks like you're finalizing plans! 🌅\nI can scan your linked calendars to find a time that works for everyone before sunset.", actions: ['Find common times'] },
];

const AI_QUICK_ACTIONS = [
  { id: 'a1', icon: <Calendar size={14} color={C.textPrimary} />, label: 'Compare Schedules' },
  { id: 'a2', icon: <Map size={14} color={C.textPrimary} />, label: 'Find Routes' },
  { id: 'a3', icon: <Sparkles size={14} color={C.textPrimary} />, label: 'Draft Itinerary' },
];

function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const router = useRouter();

  // State to toggle between Inbox and Active Chat
  const [activeChat, setActiveChat] = useState<{ id: string; title: string } | null>(null);

  // Chat Session State
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const flatListRef = useRef<FlatList>(null);

  // Reset messages when opening a new chat (Mock behavior)
  useEffect(() => {
    if (activeChat) setMessages(INITIAL_MESSAGES);
  }, [activeChat]);

  // ─── API Logic for Chat ───
  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;

    const messageText = inputText;
    setInputText(''); 

    // Optimistic UI update
    setMessages(prev => [...prev, {
      id: Date.now().toString(), type: 'user', sender: 'You', text: messageText, isMe: true, time: 'Just now',
    }]);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // AI Trigger Check
    if (messageText.toLowerCase().includes('@ai') || messageText.toLowerCase().includes('schedule')) {
      setIsTyping(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }

    try {
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
      
      const res = await fetch(`${apiBase}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket_id: activeChat.id, sender_name: "Neil", text: messageText })
      });

      const data = await res.json();

      if (data.ai_reply || messageText.toLowerCase().includes('@ai')) {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(), type: 'ai', text: data.ai_reply?.text || "I've synthesized the schedules. Saturday at 2PM works best for everyone! ✨", actions: ['Lock it in', 'Suggest alternate']
        }]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      console.error("Chat sync failed:", error);
      setIsTyping(false);
    }
  };

  // ─── VIEW 1: INBOX ───
  const renderInbox = () => (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.iconBtn}>
          <ChevronLeft color={C.textPrimary} size={28} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>INBOX</Text>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.iconBtn}>
          <Edit color={C.accent} size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchInner}>
          <Search color={C.textLight} size={15} style={{ marginRight: 8 }} />
          <TextInput style={styles.searchInput} placeholder="Search messages..." placeholderTextColor={C.textLight} />
        </View>
      </View>

      <FlatList
        data={MOCK_CHATS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setActiveChat({ id: item.id, title: item.title })}>
            <Avatar name={item.user} />
            <View style={styles.rowContent}>
              <View style={styles.rowTop}>
                <Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <View style={styles.rowBottom}>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  <Text style={styles.chatUser}>{item.user}: </Text>{item.last}
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

  // ─── VIEW 2: ACTIVE CHAT SESSION ───
  const renderChatSession = () => (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Chat Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveChat(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.iconBtn}>
            <ChevronLeft color={C.textPrimary} size={28} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.eyebrow}>GROUP CHAT</Text>
            <Text style={styles.headerTitle}>{activeChat?.title}</Text> 
          </View>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.iconBtn}>
            <Info color={C.accent} size={22} />
          </TouchableOpacity>
        </View>

        {/* Chat Bubbles */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.aiTypingContainer}>
                <Sparkles size={14} color={C.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.aiTypingText}>Agent is analyzing...</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === 'ai') {
              return (
                <View style={styles.aiBubbleContainer}>
                  <View style={styles.aiHeader}>
                    <Sparkles size={14} color={C.accentDark} />
                    <Text style={styles.aiHeaderText}>Buck-it Agent</Text>
                  </View>
                  <Text style={styles.aiText}>{item.text}</Text>
                  {item.actions && (
                    <View style={styles.aiActionRow}>
                      {item.actions.map((action: string, idx: number) => (
                        <TouchableOpacity key={idx} style={styles.aiActionButton}>
                          <Text style={styles.aiActionText}>{action}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            }
            return (
              <View style={[styles.messageRow, item.isMe ? styles.messageRowMe : styles.messageRowOther]}>
                {!item.isMe && (
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarTextSmall}>{item.sender.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ maxWidth: '75%' }}>
                  {!item.isMe && <Text style={styles.senderName}>{item.sender}</Text>}
                  <View style={[styles.bubble, item.isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    <Text style={[styles.messageText, item.isMe && styles.messageTextMe]}>{item.text}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Quick Actions */}
        <View style={styles.quickActionBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={AI_QUICK_ACTIONS}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.quickActionPill} onPress={() => setInputText(`@AI ${item.label}`)}>
                {item.icon}
                <Text style={styles.quickActionText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.aiPingButton} onPress={() => setInputText(prev => prev + '@AI ')}>
            <Sparkles color="#fff" size={16} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message group or @AI..."
            placeholderTextColor={C.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} onPress={handleSend} disabled={!inputText.trim()}>
            <Send color={C.textPrimary} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Return logic: Show Chat if activeChat exists, otherwise show Inbox
  return activeChat ? renderChatSession() : renderInbox();
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, color: C.textLight, marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.4 },
  
  // Inbox Styles
  searchWrap: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 12 },
  searchInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary, fontWeight: '400' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 70 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.accentLight, borderWidth: 1, borderColor: C.borderMid, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 15, fontWeight: '600', color: C.accent, letterSpacing: 0.3 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.2, flex: 1, marginRight: 8 },
  chatTime: { fontSize: 11, color: C.textLight, fontWeight: '500' },
  chatUser: { fontWeight: '600', color: C.accent },
  chatPreview: { fontSize: 13, color: C.textMuted, flex: 1, marginRight: 8 },
  unreadBadge: { backgroundColor: C.accentDark, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Chat Session Styles
  chatListContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.borderMid, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 4 },
  avatarTextSmall: { fontSize: 12, fontWeight: '700', color: C.accentDark },
  senderName: { fontSize: 11, color: C.textMuted, marginBottom: 4, marginLeft: 4 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleOther: { backgroundColor: C.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleMe: { backgroundColor: C.accentDark, borderBottomRightRadius: 4 },
  messageText: { fontSize: 15, color: C.textPrimary, lineHeight: 20 },
  messageTextMe: { color: '#fff' },
  
  // AI Styles
  aiBubbleContainer: { backgroundColor: C.aiBubble, borderRadius: 16, padding: 16, marginVertical: 16, borderWidth: 1, borderColor: C.borderMid, marginHorizontal: 8 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  aiHeaderText: { fontSize: 13, fontWeight: '800', color: C.accentDark, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  aiText: { fontSize: 14, color: C.textPrimary, lineHeight: 22, fontWeight: '500' },
  aiActionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  aiActionButton: { backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  aiActionText: { fontSize: 13, fontWeight: '700', color: C.accentDark },
  aiTypingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  aiTypingText: { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  
  // Input Styles
  quickActionBar: { paddingVertical: 8, backgroundColor: C.bg },
  quickActionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  quickActionText: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginLeft: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  aiPingButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  input: { flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, minHeight: 40, maxHeight: 100, fontSize: 15, color: C.textPrimary },
  sendButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});