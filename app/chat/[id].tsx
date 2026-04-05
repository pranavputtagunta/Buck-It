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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft, Send, Sparkles, Calendar, Map, Info } from 'lucide-react-native';
import { supabase } from '../../app/lib/supabase';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#f7f5f2', surface: '#ffffff', border: '#e8e3dc', borderMid: '#ddd6cc',
  textPrimary: '#1a1814', textMuted: '#a09890', textLight: '#c0b9b0',
  accent: '#7a6e62', accentDark: '#3a342e', accentLight: '#ede9e3', aiBubble: '#f0efe9',
};

const AI_QUICK_ACTIONS = [
  { id: 'a1', icon: <Calendar size={14} color={C.textPrimary} />, label: 'Compare Schedules' },
  { id: 'a2', icon: <Map size={14} color={C.textPrimary} />, label: 'Find Routes' },
  { id: 'a3', icon: <Sparkles size={14} color={C.textPrimary} />, label: 'Draft Itinerary' },
];

export default function ChatRoomScreen() {
  const router = useRouter();
  // Grab the dynamic ID and title passed from the HomeFeed
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch User & Messages
  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase.from('users').select('display_name').eq('id', session.user.id).single();
        if (profile?.display_name) setUserName(profile.display_name);
      }

      // Fetch existing messages for this chat
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true });

      if (data) {
        const mappedMessages = data.map(m => ({
          id: m.id,
          type: m.type,
          sender: m.sender_name,
          text: m.text,
          isMe: m.user_id === session?.user?.id,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(mappedMessages);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
    };

    if (id) initChat();
  }, [id]);

  // 2. Handle Sending Message
  const handleSend = async () => {
    if (!inputText.trim() || !userId) return;

    const messageText = inputText;
    setInputText(''); 

    // Optimistic UI update
    setMessages(prev => [...prev, {
      id: Date.now().toString(), type: 'user', sender: userName, text: messageText, isMe: true, time: 'Just now',
    }]);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    if (messageText.toLowerCase().includes('@ai') || messageText.toLowerCase().includes('schedule')) {
      setIsTyping(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }

    try {
      // Save user message to DB
      await supabase.from('chat_messages').insert({
        chat_id: id,
        user_id: userId,
        sender_name: userName,
        text: messageText,
        type: 'user'
      });

      // Hit FastAPI backend
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (apiBase) {
        const res = await fetch(`${apiBase}/api/chat/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: id, user_id: userId, sender_name: userName, text: messageText })
        });

        const data = await res.json();

        if (data.ai_reply) {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(), 
            type: 'ai', 
            text: data.ai_reply.text, 
            actions: ['Lock it in', 'Suggest alternate']
          }]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch (error) {
      console.error("Chat sync failed:", error);
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Hide the default Expo Router header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Chat Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.iconBtn}>
            <ChevronLeft color={C.textPrimary} size={28} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.eyebrow}>GROUP CHAT</Text>
            <Text style={styles.headerTitle}>{title || 'Chat'}</Text> 
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
                    <Text style={styles.avatarTextSmall}>{item.sender ? item.sender.charAt(0).toUpperCase() : '?'}</Text>
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
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, color: C.textLight, marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.4 },
  
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
  
  aiBubbleContainer: { backgroundColor: C.aiBubble, borderRadius: 16, padding: 16, marginVertical: 16, borderWidth: 1, borderColor: C.borderMid, marginHorizontal: 8 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  aiHeaderText: { fontSize: 13, fontWeight: '800', color: C.accentDark, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  aiText: { fontSize: 14, color: C.textPrimary, lineHeight: 22, fontWeight: '500' },
  aiActionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  aiActionButton: { backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  aiActionText: { fontSize: 13, fontWeight: '700', color: C.accentDark },
  aiTypingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  aiTypingText: { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  
  quickActionBar: { paddingVertical: 8, backgroundColor: C.bg },
  quickActionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  quickActionText: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginLeft: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  aiPingButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  input: { flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, minHeight: 40, maxHeight: 100, fontSize: 15, color: C.textPrimary },
  sendButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});