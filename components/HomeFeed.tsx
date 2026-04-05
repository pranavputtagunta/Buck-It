import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ListRenderItemInfo,
  SafeAreaView,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  LayoutAnimation,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Send,
  PlusSquare,
  Filter,
  Check,
  MapPin,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Bookmark,
  LogOut,
  Sparkles,
} from "lucide-react-native";
import MapModule from "./MapModule";
import CreateEventModal from "./CreateEventModal";
import { supabase } from "../app/lib/supabase";
import Fuse from "fuse.js";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const C = {
  bg: "#f7f5f2", surface: "#ffffff", border: "#e8e3dc", borderMid: "#ddd6cc",
  textPrimary: "#1a1814", textMuted: "#a09890", textLight: "#c0b9b0",
  accent: "#7a6e62", accentDark: "#3a342e", accentLight: "#ede9e3",
  red: "#b84030", redBg: "#fff5f3", redBorder: "#f2d0c8", blue: "#318bfb",
};

const MOCK_STORIES = [ { id: "1", name: "Alex", image: "https://images.unsplash.com/photo-1506869640319-ce1a24fd4ce8?q=80&w=200&auto=format&fit=crop" } ];

interface EventItem { id: string; user: string; locationName: string; coords: { latitude: number; longitude: number }; title: string; image: string; deadline: string; bucketItemId: string; tags: string[]; category?: string; time_slots: string[]; _searchString: string; }
interface PostItem { id: string; user: string; locationName: string; caption: string; image: string; likes: number; tags: string[]; category: string; }
interface BucketListItem { id: string; title: string; tags: string[]; }

export default function HomeFeed() {
  const router = useRouter();
  const [feedType, setFeedType] = useState<"Events" | "Posts">("Events");
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

  // Modals
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isPostOptionsVisible, setIsPostOptionsVisible] = useState(false);
  const [isCreateEventVisible, setIsCreateEventVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const shareSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Data
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [recommendedEvents, setRecommendedEvents] = useState<EventItem[]>([]);
  const [dbPosts, setDbPosts] = useState<PostItem[]>([]);
  const [availableChats, setAvailableChats] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Filter States
  const [userBucketItems, setUserBucketItems] = useState<BucketListItem[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  useEffect(() => {
    const buildFeed = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      setUserId(uid);

      try {
        const { data: profile } = await supabase.from("users").select("display_name, interests, personality").eq("id", uid).single();
        if (profile) setUserName(profile.display_name);

        const { data: bucketData } = await supabase.from("bucket_list_items").select("id, title, tags").eq("user_id", uid);
        if (bucketData) setUserBucketItems(bucketData);

        const { data: userMatrix } = await supabase.from("availabilities").select("available_slots").eq("user_id", uid).maybeSingle();

        const bucketTags = bucketData ? bucketData.flatMap((b) => b.tags || []) : [];
        const userPersonaQuery = [profile?.personality, ...(profile?.interests || []), ...bucketTags, ...(userMatrix?.available_slots || [])].filter(Boolean).join(" ");

        const { data: chatParts } = await supabase.from("chat_participants").select(`chat_id, chats ( id, title )`).eq("user_id", uid);
        if (chatParts) setAvailableChats(chatParts.map((p: any) => Array.isArray(p.chats) ? p.chats[0] : p.chats));

        const { data: postsData } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
        if (postsData) setDbPosts(postsData.map((p) => ({ id: p.id, user: p.user_name, locationName: p.location_name, caption: p.caption, image: p.image, likes: p.likes, tags: p.tags, category: p.category })));

        const { data: discoverEventsData } = await supabase.from("discover_events").select("*").order("created_at", { ascending: false });
        if (discoverEventsData) {
          const formatted: EventItem[] = discoverEventsData.map((ev) => ({
            id: ev.id, user: "Bucket Community", locationName: ev.location_name || "San Diego", 
            coords: { latitude: ev.latitude || 32.7157, longitude: ev.longitude || -117.1611 },
            title: ev.title, image: ev.image || 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=800',
            deadline: ev.deadline || "Join anytime", bucketItemId: ev.bucket_item_id, tags: ev.tags || [], category: ev.tags?.[0] || "General", time_slots: ev.time_slots || [], 
            _searchString: `${ev.title} ${(ev.tags || []).join(" ")}`,
          } as any));

          if (userPersonaQuery.trim().length > 0) {
            const fuse = new Fuse(formatted, { keys: ["_searchString"], threshold: 0.6 });
            const results = fuse.search(userPersonaQuery);
            if (results.length > 0) {
              const matchedIds = new Set(results.map((r) => r.item.id));
              setRecommendedEvents([...results.map((r) => r.item), ...formatted.filter((f) => !matchedIds.has(f.id))]);
            } else { setRecommendedEvents(formatted); }
          } else { setRecommendedEvents(formatted); }
        }
      } catch (err) { console.error(err); } finally { setIsLoadingFeed(false); }
    };
    buildFeed();
  }, []);

  const filteredEvents = useMemo(() => {
    if (!activeFilterId) return recommendedEvents;
    const selectedGoal = userBucketItems.find(item => item.id === activeFilterId);
    if (!selectedGoal || !selectedGoal.tags || selectedGoal.tags.length === 0) return recommendedEvents;

    const goalTags = selectedGoal.tags.map(t => t.toLowerCase());

    return recommendedEvents
      .map(event => {
        const eventTags = (event.tags || []).map(t => t.toLowerCase());
        const intersection = eventTags.filter(tag => goalTags.includes(tag));
        return { ...event, matchCount: intersection.length };
      })
      .filter(event => (event as any).matchCount > 0)
      .sort((a: any, b: any) => b.matchCount - a.matchCount);
  }, [activeFilterId, recommendedEvents, userBucketItems]);

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const toggleMap = (id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedMapId((prev) => (prev === id ? null : id)); };
  const openFilter = () => { setIsFilterVisible(true); Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(); };
  const closeFilter = () => { Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => setIsFilterVisible(false)); };
  const openShareModal = (item: any) => { setSelectedItem(item); setIsShareModalVisible(true); Animated.spring(shareSlideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(); };
  const closeShareModal = () => { Animated.timing(shareSlideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }).start(() => { setIsShareModalVisible(false); setSelectedItem(null); }); };

  const handleLockItIn = async (item: EventItem) => {
    if (!userId || lockingId) return;
    setLockingId(item.id);
    try {
      const { data: chatData } = await supabase.from("chats").insert({ title: item.title }).select().single();
      const { data: randomUsers } = await supabase.from("users").select("id").neq("id", userId).limit(8);
      const participants = [{ chat_id: chatData.id, user_id: userId }];
      if (randomUsers) randomUsers.forEach((u) => participants.push({ chat_id: chatData.id, user_id: u.id }));

      await supabase.from("chat_participants").insert(participants);
      await supabase.from("chat_messages").insert({ chat_id: chatData.id, sender_name: "Buck-it Agent", text: `Group created for **${item.title}**! Analyzing availability... ✨`, type: "ai" });
      await supabase.from("events").insert({ user_id: userId, title: item.title, status_text: "Awaiting RSVPs", participants: participants.length, is_active: false, completed: false, category: item.category || "General", tags: item.tags || [] });

      router.push({ pathname: "/chat/[id]", params: { id: chatData.id, title: item.title } });
    } catch (err) { console.error(err); } finally { setLockingId(null); }
  };

  const handleShareToChat = async (chatId: string) => {
    if (!selectedItem || !userId) return;
    try {
      const isAIGen = selectedItem.mode === "AI_GEN";
      const shareText = isAIGen ? `@AI Suggested Event: ${selectedItem.user}'s memory at ${selectedItem.locationName} looks great. Can we find a time for the group?` : `Check this out: ${selectedItem.title || selectedItem.locationName}`;
      await supabase.from("chat_messages").insert({ chat_id: chatId, user_id: userId, sender_name: userName, text: shareText, type: isAIGen ? "ai" : "user" });
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
      await fetch(`${apiBase}/api/chat/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, sender_name: userName, text: shareText, metadata: isAIGen ? { tags: selectedItem.tags, category: selectedItem.category, location: selectedItem.locationName } : null }),
      });
      closeShareModal(); Alert.alert("Shared!", "Sent to group chat.");
    } catch (err) { console.error(err); }
  };

  const renderEvent = ({ item }: ListRenderItemInfo<EventItem>) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardUser}>{item.user}</Text>
        <TouchableOpacity style={styles.locationRow} onPress={() => toggleMap(item.id)}>
          <MapPin color={C.blue} size={12} style={{ marginRight: 4 }} />
          <Text style={styles.cardLocation}>{item.locationName}</Text>
          {expandedMapId === item.id ? ( <ChevronUp color={C.textMuted} size={14} /> ) : ( <ChevronDown color={C.textMuted} size={14} /> )}
        </TouchableOpacity>
      </View>
      {expandedMapId === item.id && ( <MapModule coords={item.coords} locationName={item.locationName} /> )}
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardFooter}>
        <View style={styles.eventTitleRow}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <TouchableOpacity onPress={() => openShareModal(item)} hitSlop={10}><Send color={C.textPrimary} size={20} /></TouchableOpacity>
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagContainer}>
            {item.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagPill}><Text style={styles.tagText}>{tag.replace('_', ' ')}</Text></View>
            ))}
          </View>
        )}
        <View style={styles.deadlineBadge}><Text style={styles.deadlineText}>{item.deadline}</Text></View>
        <TouchableOpacity style={styles.lockBtn} onPress={() => handleLockItIn(item)} disabled={!!lockingId}>
          {lockingId === item.id ? ( <ActivityIndicator color={C.accentDark} size="small" /> ) : ( <Text style={styles.lockBtnText}>Lock it in</Text> )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPost = ({ item }: ListRenderItemInfo<PostItem>) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}><Text style={styles.cardUser}>{item.user}</Text><Text style={styles.cardLocation}>{item.locationName}</Text></View>
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.postActions}>
        <View style={styles.postIconsLeft}>
          <Heart color={C.textPrimary} size={24} style={{ marginRight: 16 }} />
          <MessageCircle color={C.textPrimary} size={24} style={{ marginRight: 16 }} />
          <TouchableOpacity onPress={() => { setSelectedItem(item); setIsPostOptionsVisible(true); }}><Send color={C.textPrimary} size={24} /></TouchableOpacity>
        </View>
        <Bookmark color={C.textPrimary} size={24} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.likesText}>{item.likes} likes</Text>
        <Text style={styles.captionText}><Text style={styles.captionUser}>{item.user} </Text>{item.caption}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logoText}>Bucket</Text>
          <View style={styles.headerIcons}>
            {feedType === "Events" && (
              <TouchableOpacity style={styles.iconBtn} onPress={openFilter}>
                <Filter color={activeFilterId ? C.blue : C.textPrimary} size={24} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={() => setIsCreateEventVisible(true)}>
              <PlusSquare color={C.textPrimary} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/messages")}><Send color={C.textPrimary} size={24} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}><LogOut color={C.textMuted} size={22} /></TouchableOpacity>
          </View>
        </View>

        {isLoadingFeed ? (
          <ActivityIndicator style={{ marginTop: 50 }} color={C.textPrimary} />
        ) : (
          <FlatList
            data={feedType === "Events" ? filteredEvents : dbPosts}
            keyExtractor={(item) => item.id}
            renderItem={feedType === "Events" ? renderEvent : renderPost}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View>
                <View style={styles.storiesRow}>
                  <FlatList data={MOCK_STORIES} horizontal showsHorizontalScrollIndicator={false} keyExtractor={item => item.id} renderItem={({ item }) => (
                      <View style={styles.storyContainer}>
                        <View style={styles.storyRing}><Image source={{ uri: item.image }} style={styles.storyImage} /></View>
                        <Text style={styles.storyText}>{item.name}</Text>
                      </View>
                    )} contentContainerStyle={{ paddingHorizontal: 16 }} />
                </View>
                <View style={styles.switcher}>
                  {["Events", "Scrapbook"].map((tab) => (
                    <TouchableOpacity key={tab} style={[styles.switcherTab, feedType === (tab === "Scrapbook" ? "Posts" : tab) && styles.switcherTabActive]} onPress={() => setFeedType(tab === "Scrapbook" ? "Posts" : "Events")}>
                      <Text style={[styles.switcherText, feedType === (tab === "Scrapbook" ? "Posts" : tab) && styles.switcherTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {activeFilterId && (
                  <View style={styles.filterBar}>
                    <Text style={styles.filterBarText}>Matching: <Text style={{fontWeight: '700'}}>{userBucketItems.find(i => i.id === activeFilterId)?.title}</Text></Text>
                    <TouchableOpacity onPress={() => setActiveFilterId(null)}><Text style={styles.clearFilterText}>Clear</Text></TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        )}

        <CreateEventModal visible={isCreateEventVisible} onClose={() => setIsCreateEventVisible(false)} userId={userId} onSuccess={(newEvent) => { setRecommendedEvents(prev => [newEvent, ...prev]); Alert.alert("Success", "Event published!"); }} />

        <Modal visible={isFilterVisible} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={closeFilter}>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.dragHandleWrap}><View style={styles.dragHandle} /></View>
                <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Match events to your goals</Text></View>
                <FlatList data={userBucketItems} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 16 }} renderItem={({ item }) => (
                    <TouchableOpacity style={styles.filterRow} onPress={() => setActiveFilterId(activeFilterId === item.id ? null : item.id)}>
                      <View style={{flex: 1}}>
                        <Text style={[styles.filterRowText, activeFilterId === item.id && styles.filterRowTextActive]}>{item.title}</Text>
                        <Text style={styles.filterRowSubtext}>{(item.tags || []).join(", ")}</Text>
                      </View>
                      {activeFilterId === item.id ? ( <Check color={C.blue} size={18} /> ) : ( <View style={styles.emptyCircle} /> )}
                    </TouchableOpacity>
                  )} />
                <TouchableOpacity style={styles.applyBtn} onPress={closeFilter}><Text style={styles.applyBtnText}>See Matches</Text></TouchableOpacity>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>

        <Modal visible={isPostOptionsVisible} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={() => setIsPostOptionsVisible(false)}>
            <View style={styles.optionSheet}>
              <Text style={styles.sheetTitle}>Share Post</Text>
              <TouchableOpacity style={styles.optionBtn} onPress={() => { setIsPostOptionsVisible(false); openShareModal(selectedItem); }}><Send color={C.textPrimary} size={20} style={{ marginRight: 12 }} /><Text style={styles.optionBtnText}>Share as Post</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.optionBtn, { backgroundColor: C.accentLight }]} onPress={() => { setIsPostOptionsVisible(false); openShareModal({ ...selectedItem, mode: "AI_GEN" }); }}><Sparkles color={C.accentDark} size={20} style={{ marginRight: 12 }} /><Text style={[styles.optionBtnText, { color: C.accentDark }]}>Share as AI Event</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={isShareModalVisible} transparent animationType="none">
          <Pressable style={styles.overlay} onPress={closeShareModal}>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: shareSlideAnim }] }]}>
              <View style={styles.dragHandleWrap}><View style={styles.dragHandle} /></View>
              <Text style={styles.sheetTitle}>Share to Group</Text>
              <FlatList data={availableChats} keyExtractor={(item) => item.id} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.chatRow} onPress={() => handleShareToChat(item.id)}><View style={styles.chatAvatar}><Text style={styles.avatarText}>{item.title.substring(0, 2).toUpperCase()}</Text></View><Text style={styles.chatRowText}>{item.title}</Text><Send color={C.blue} size={18} /></TouchableOpacity>
                )} />
            </Animated.View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  logoText: { fontSize: 26, fontWeight: "700", letterSpacing: -0.8, color: C.textPrimary }, headerIcons: { flexDirection: "row", alignItems: "center" }, iconBtn: { marginLeft: 18 },
  storiesRow: { paddingVertical: 14, borderBottomWidth: 1, borderColor: C.border, backgroundColor: C.surface }, storyContainer: { alignItems: "center", marginRight: 16 },
  storyRing: { padding: 2, borderRadius: 40, borderWidth: 2, borderColor: C.accentDark }, storyImage: { width: 62, height: 62, borderRadius: 31 }, storyText: { marginTop: 5, fontSize: 11, fontWeight: "600", color: C.textPrimary },
  switcher: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border, backgroundColor: C.surface }, switcherTab: { flex: 1, paddingVertical: 13, alignItems: "center" }, switcherTabActive: { borderBottomWidth: 2, borderBottomColor: C.accentDark }, switcherText: { fontSize: 14, fontWeight: "500", color: C.textMuted }, switcherTextActive: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  cardContainer: { marginBottom: 20, borderBottomWidth: 1, borderColor: C.border, paddingBottom: 16, backgroundColor: C.surface }, cardHeader: { paddingHorizontal: 14, paddingVertical: 11 }, cardUser: { fontSize: 14, fontWeight: "700", color: C.textPrimary }, locationRow: { flexDirection: "row", alignItems: "center", marginTop: 2 }, cardLocation: { fontSize: 12, color: C.textMuted, flex: 1 }, cardImage: { width: "100%", height: 380, backgroundColor: C.accentLight }, cardFooter: { paddingHorizontal: 14, paddingTop: 10 },
  eventTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eventTitle: { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 8, flex: 1 },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tagPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.accentLight },
  tagText: { fontSize: 10, fontWeight: "700", color: C.accentDark, textTransform: "uppercase" },
  deadlineBadge: { backgroundColor: C.redBg, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: C.redBorder, marginBottom: 12 }, deadlineText: { color: C.red, fontSize: 11, fontWeight: "700" },
  lockBtn: { backgroundColor: C.accentLight, borderWidth: 1, borderColor: C.borderMid, paddingVertical: 12, borderRadius: 12, alignItems: "center", height: 48, justifyContent: "center" }, lockBtnText: { color: C.accentDark, fontWeight: "700", fontSize: 14 },
  postActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 12 }, postIconsLeft: { flexDirection: "row", alignItems: "center" }, likesText: { fontWeight: "700", color: C.textPrimary, marginBottom: 4, marginTop: 6, paddingHorizontal: 14 }, captionText: { color: C.textPrimary, fontSize: 14, lineHeight: 20, paddingHorizontal: 14 }, captionUser: { fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(26,24,20,0.45)", justifyContent: "flex-end" }, sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: "80%" }, optionSheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }, dragHandleWrap: { alignItems: "center", marginBottom: 14 }, dragHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 99 }, sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: C.border }, sheetTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, textAlign: "center", marginBottom: 20 }, optionBtn: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 }, optionBtnText: { fontSize: 16, fontWeight: "600" }, filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: "#f5f2ef" }, filterRowText: { fontSize: 15, color: C.textPrimary, fontWeight: "500" }, filterRowTextActive: { color: C.blue, fontWeight: "700" }, filterRowSubtext: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  emptyCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.borderMid }, chatRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: C.bg }, chatAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentLight, justifyContent: "center", alignItems: "center", marginRight: 12 }, avatarText: { fontSize: 12, fontWeight: "700", color: C.accentDark }, chatRowText: { flex: 1, fontSize: 16, fontWeight: "500" }, applyBtn: { backgroundColor: C.accentDark, paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 16 }, applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  filterBar: { backgroundColor: C.accentLight, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, borderRadius: 8, marginBottom: 10 },
  filterBarText: { fontSize: 12, color: C.accentDark },
  clearFilterText: { fontSize: 12, color: C.blue, fontWeight: '700' }
});