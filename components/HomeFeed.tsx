import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ListRenderItemInfo,
  SafeAreaView,
  RefreshControl,
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
  Sparkles,
} from "lucide-react-native";
import MapModule from "./MapModule";
import { supabase } from "../app/lib/supabase";
import { bucketService } from "../src/services/bucketService";
import { API_BASE_URL } from "../src/services/apiClient";

const SCREEN_HEIGHT = Dimensions.get("window").height;

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
  red: "#b84030",
  redBg: "#fff5f3",
  redBorder: "#f2d0c8",
  blue: "#318bfb",
};

// ─── Types & Mock Data ────────────────────────────────────────────────────────

const MOCK_GOALS: BucketItem[] = [
  { id: "1", title: "Learn to Surf", category: "Health & Fitness" },
  {
    id: "2",
    title: "Build an AI Hardware Project",
    category: "Career & Skills",
  },
  { id: "3", title: "Hike Yosemite Half Dome", category: "Travel & Adventure" },
];

const MOCK_STORIES: Story[] = [
  {
    id: "1",
    name: "Alex",
    image:
      "https://images.unsplash.com/photo-1506869640319-ce1a24fd4ce8?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "2",
    name: "Sam",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "3",
    name: "Jordan",
    image:
      "https://images.unsplash.com/photo-1526401485004-46910ecc8e51?q=80&w=200&auto=format&fit=crop",
  },
];

interface BucketItem {
  id: string;
  title: string;
  category: string;
}
interface Story {
  id: string;
  name: string;
  image: string;
}
interface EventItem {
  id: string;
  user: string;
  locationName: string;
  coords: { latitude: number; longitude: number };
  title: string;
  image: string;
  deadline: string;
  bucketItemId: string;
  tags: string[];
  time_slots: string[];
}

interface DiscoverBucketItem {
  id?: string;
  title?: string;
  category?: string;
  event_time?: string;
  bucket_list_item_id?: string;
  image?: string;
  tags?: string[];
  time_slots?: string[];
  latitude?: number;
  longitude?: number;
}

interface PostItem {
  id: string;
  user: string;
  locationName: string;
  caption: string;
  image: string;
  likes: number;
  tags: string[];
  category: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomeFeed() {
  const router = useRouter();
  const [feedType, setFeedType] = useState<"Events" | "Posts">("Events");
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

  // Modals & Animations
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isPostOptionsVisible, setIsPostOptionsVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const shareSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Data States
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [copyingPostId, setCopyingPostId] = useState<string | null>(null);
  const [recommendedEvents, setRecommendedEvents] = useState<EventItem[]>([]);
  const [dbPosts, setDbPosts] = useState<PostItem[]>([]);
  const [availableChats, setAvailableChats] = useState<any[]>([]);
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isRefreshingEvents, setIsRefreshingEvents] = useState(false);

  const loadDiscoverEvents = async (uid: string) => {
    let discoverFeed: DiscoverBucketItem[] = [];

    try {
      const generatedFeed = await bucketService.getDiscoverFeed(uid);
      discoverFeed = Array.isArray(generatedFeed)
        ? (generatedFeed as DiscoverBucketItem[])
        : [];
    } catch (error) {
      console.warn("Generated discover feed failed, falling back:", error);
    }

    if (discoverFeed.length === 0) {
      const rankedFeed = await bucketService.getDiscoverFeedRanked(uid);
      discoverFeed = Array.isArray(rankedFeed)
        ? (rankedFeed as DiscoverBucketItem[])
        : [];
    }

    const rows = discoverFeed;

    const formatted: EventItem[] = rows.map(
      (ev: DiscoverBucketItem, index: number) => ({
        id: String(ev.id ?? `discover-${index}`),
        user: "Bucket Community",
        locationName: ev.category || "Bucket recommendation",
        coords: {
          latitude: ev.latitude || 32.7157,
          longitude: ev.longitude || -117.1611,
        },
        title: ev.title || "Untitled bucket",
        image:
          ev.image ||
          "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=1200&auto=format&fit=crop",
        deadline: ev.event_time
          ? new Date(ev.event_time).toLocaleString()
          : "Flexible timing",
        bucketItemId: ev.bucket_list_item_id
          ? String(ev.bucket_list_item_id)
          : "",
        tags: Array.isArray(ev.tags) ? ev.tags : [],
        time_slots: Array.isArray(ev.time_slots) ? ev.time_slots : [],
      }),
    );

    setRecommendedEvents(formatted);
  };

  // ─── Load User & Build Algorithm ───
  useEffect(() => {
    const buildFeed = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      setUserId(uid);

      try {
        // 1. Build the Ultimate Persona Query
        const { data: profile } = await supabase
          .from("users")
          .select("display_name, interests, personality")
          .eq("id", uid)
          .single();
        if (profile) setUserName(profile.display_name);

        // 2. Fetch User's Chats for Sharing
        const { data: chatParts } = await supabase
          .from("chat_participants")
          .select(`chat_id, chats ( id, title )`)
          .eq("user_id", uid);
        if (chatParts)
          setAvailableChats(
            chatParts.map((p: any) =>
              Array.isArray(p.chats) ? p.chats[0] : p.chats,
            ),
          );

        // 3. Fetch Posts (Scrapbook)
        const { data: postsData } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });
        if (postsData) {
          setDbPosts(
            postsData.map((p) => ({
              id: p.id,
              user: p.user_name,
              locationName: p.location_name,
              caption: p.caption,
              image: p.image,
              likes: p.likes,
              tags: p.tags,
              category: p.category,
            })),
          );
        }

        // 4. Autopopulate Events from discover API
        await loadDiscoverEvents(uid);
      } catch (err) {
        console.error("Feed build error:", err);
      } finally {
        setIsLoadingFeed(false);
      }
    };
    buildFeed();
  }, []);

  // ─── Handlers ───

  const toggleMap = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMapId((prev) => (prev === id ? null : id));
  };

  const openFilter = () => {
    setIsFilterVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 12,
    }).start();
  };

  const closeFilter = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsFilterVisible(false));
  };

  const openShareModal = (item: any) => {
    setSelectedItem(item);
    setIsShareModalVisible(true);
    Animated.spring(shareSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };
  const closeShareModal = () => {
    Animated.timing(shareSlideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsShareModalVisible(false);
      setSelectedItem(null);
    });
  };

  const handleLockItIn = async (item: EventItem) => {
    if (!userId || lockingId) return;
    setLockingId(item.id);
    try {
      const { data: chatData } = await supabase
        .from("chats")
        .insert({ title: item.title })
        .select()
        .single();
      const { data: randomUsers } = await supabase
        .from("users")
        .select("id")
        .neq("id", userId)
        .limit(8);
      const participants = [{ chat_id: chatData.id, user_id: userId }];
      if (randomUsers)
        randomUsers.forEach((u) =>
          participants.push({ chat_id: chatData.id, user_id: u.id }),
        );

      await supabase.from("chat_participants").insert(participants);
      await supabase.from("chat_messages").insert({
        chat_id: chatData.id,
        sender_name: "Buck-it Agent",
        text: `Group created for **${item.title}**! Analyzing availability... ✨`,
        type: "ai",
      });
      await supabase.from("events").insert({
        user_id: userId,
        title: item.title,
        status_text: "Awaiting RSVPs",
        participants: participants.length,
        is_active: false,
        completed: false,
      });

      router.push({
        pathname: "/chat/[id]",
        params: { id: chatData.id, title: item.title },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLockingId(null);
    }
  };

  const handleShareToChat = async (chatId: string) => {
    if (!selectedItem || !userId) return;
    try {
      const isAIGen = selectedItem.mode === "AI_GEN";
      if (!isAIGen) {
        const shareText = [
          `Shared post from ${selectedItem.user || "Bucket Community"}`,
          selectedItem.caption || selectedItem.title || "",
          selectedItem.locationName
            ? `Location: ${selectedItem.locationName}`
            : "",
          selectedItem.image ? `Image: ${selectedItem.image}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        await supabase.from("chat_messages").insert({
          chat_id: chatId,
          user_id: userId,
          sender_name: userName,
          text: shareText,
          type: "user",
        });

        Alert.alert("Shared!", "Post sent to group chat.");
        closeShareModal();
        return;
      }

      await supabase.from("chat_messages").insert({
        chat_id: chatId,
        user_id: userId,
        sender_name: userName,
        text: `Generate a bucket from this post: ${selectedItem.caption || selectedItem.title || selectedItem.locationName}`,
        type: "user",
      });

      const response = await fetch(
        `${API_BASE_URL}/chat/share-post-as-ai-event`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            user_id: userId,
            sender_name: userName,
            post_user: selectedItem.user || "Bucket Community",
            post_caption: selectedItem.caption || "",
            post_location: selectedItem.locationName || "",
            post_category: selectedItem.category || "",
            post_image: selectedItem.image || "",
          }),
        },
      );

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          body?.detail || "Unable to generate AI bucket from this post.",
        );
      }

      Alert.alert("Shared!", "AI bucket shared to group chat.");
      closeShareModal();
    } catch (err) {
      console.error(err);
      Alert.alert("Share failed", "Please try again.");
    }
  };

  const handleCopyPostToMyBuckets = async (item: PostItem) => {
    if (!userId || copyingPostId) return;

    setCopyingPostId(item.id);
    try {
      const normalizedTitle =
        item.caption?.trim() || `${item.category} in ${item.locationName}`;
      const statusText = `Inspired by ${item.user}'s completed bucket`;

      const { error } = await supabase.from("events").insert({
        user_id: userId,
        title: normalizedTitle,
        status_text: statusText,
        participants: 1,
        is_active: false,
        completed: false,
      });

      if (error) throw error;

      Alert.alert(
        "Added to your buckets",
        "This activity is now in your Planning tab.",
      );
    } catch (err) {
      console.error("Failed to copy post to buckets:", err);
      Alert.alert("Could not copy", "Please try again.");
    } finally {
      setCopyingPostId(null);
    }
  };

  const refreshEvents = async () => {
    if (!userId) return;
    try {
      setIsRefreshingEvents(true);
      await loadDiscoverEvents(userId);
    } catch (err) {
      console.error("Discover refresh failed:", err);
      Alert.alert("Refresh failed", "Could not reload discover events.");
    } finally {
      setIsRefreshingEvents(false);
    }
  };

  // ─── Renderers ───

  const renderEvent = ({ item }: ListRenderItemInfo<EventItem>) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardUser}>{item.user}</Text>
        <TouchableOpacity
          style={styles.locationRow}
          onPress={() => toggleMap(item.id)}
        >
          <MapPin color={C.blue} size={12} style={{ marginRight: 4 }} />
          <Text style={styles.cardLocation}>{item.locationName}</Text>
          {expandedMapId === item.id ? (
            <ChevronUp color={C.textMuted} size={14} />
          ) : (
            <ChevronDown color={C.textMuted} size={14} />
          )}
        </TouchableOpacity>
      </View>
      {expandedMapId === item.id && (
        <MapModule coords={item.coords} locationName={item.locationName} />
      )}
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardFooter}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.eventTitle}>{item.title}</Text>
          <TouchableOpacity onPress={() => openShareModal(item)} hitSlop={10}>
            <Send color={C.textPrimary} size={20} />
          </TouchableOpacity>
        </View>
        <View style={styles.deadlineBadge}>
          <Text style={styles.deadlineText}>{item.deadline}</Text>
        </View>
        <TouchableOpacity
          style={styles.lockBtn}
          onPress={() => handleLockItIn(item)}
          disabled={!!lockingId}
        >
          {lockingId === item.id ? (
            <ActivityIndicator color={C.accentDark} size="small" />
          ) : (
            <Text style={styles.lockBtnText}>Lock it in</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPost = ({ item }: ListRenderItemInfo<PostItem>) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardUser}>{item.user}</Text>
        <Text style={styles.cardLocation}>{item.locationName}</Text>
      </View>
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.postActions}>
        <View style={styles.postIconsLeft}>
          <Heart color={C.textPrimary} size={24} style={{ marginRight: 16 }} />
          <MessageCircle
            color={C.textPrimary}
            size={24}
            style={{ marginRight: 16 }}
          />
          <TouchableOpacity
            onPress={() => {
              setSelectedItem(item);
              setIsPostOptionsVisible(true);
            }}
          >
            <Send color={C.textPrimary} size={24} />
          </TouchableOpacity>
        </View>
        <Bookmark color={C.textPrimary} size={24} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.likesText}>{item.likes} likes</Text>
        <Text style={styles.captionText}>
          <Text style={styles.captionUser}>{item.user} </Text>
          {item.caption}
        </Text>
        <TouchableOpacity
          style={[
            styles.inspireBtn,
            copyingPostId === item.id && { opacity: 0.7 },
          ]}
          onPress={() => handleCopyPostToMyBuckets(item)}
          disabled={copyingPostId === item.id}
          activeOpacity={0.8}
        >
          {copyingPostId === item.id ? (
            <ActivityIndicator color={C.accentDark} size="small" />
          ) : (
            <Text style={styles.inspireBtnText}>Do this activity</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logoText}>Buck-It</Text>
          <View style={styles.headerIcons}>
            {feedType === "Events" && (
              <TouchableOpacity style={styles.iconBtn} onPress={openFilter}>
                <Filter
                  color={activeFilterIds.length > 0 ? C.blue : C.textPrimary}
                  size={24}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn}>
              <PlusSquare color={C.textPrimary} size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/messages")}
            >
              <Send color={C.textPrimary} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoadingFeed ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={C.textPrimary} />
            <Text style={styles.loaderText}>populating your feed</Text>
          </View>
        ) : feedType === "Events" ? (
          <FlatList
            data={
              activeFilterIds.length
                ? recommendedEvents.filter((e) =>
                    activeFilterIds.includes(e.bucketItemId),
                  )
                : recommendedEvents
            }
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshingEvents}
                onRefresh={() => void refreshEvents()}
              />
            }
            ListHeaderComponent={() => (
              <View>
                <View style={styles.storiesRow}>
                  <FlatList
                    data={MOCK_STORIES}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.storyContainer}>
                        <View style={styles.storyRing}>
                          <Image
                            source={{ uri: item.image }}
                            style={styles.storyImage}
                          />
                        </View>
                        <Text style={styles.storyText}>{item.name}</Text>
                      </View>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                  />
                </View>
                <View style={styles.switcher}>
                  {["Events", "Scrapbook"].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.switcherTab,
                        feedType === (tab === "Scrapbook" ? "Posts" : tab) &&
                          styles.switcherTabActive,
                      ]}
                      onPress={() =>
                        setFeedType(tab === "Scrapbook" ? "Posts" : "Events")
                      }
                    >
                      <Text
                        style={[
                          styles.switcherText,
                          feedType === (tab === "Scrapbook" ? "Posts" : tab) &&
                            styles.switcherTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={dbPosts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View>
                <View style={styles.storiesRow}>
                  <FlatList
                    data={MOCK_STORIES}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.storyContainer}>
                        <View style={styles.storyRing}>
                          <Image
                            source={{ uri: item.image }}
                            style={styles.storyImage}
                          />
                        </View>
                        <Text style={styles.storyText}>{item.name}</Text>
                      </View>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                  />
                </View>
                <View style={styles.switcher}>
                  {["Events", "Scrapbook"].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.switcherTab,
                        feedType === (tab === "Scrapbook" ? "Posts" : tab) &&
                          styles.switcherTabActive,
                      ]}
                      onPress={() =>
                        setFeedType(tab === "Scrapbook" ? "Posts" : "Events")
                      }
                    >
                      <Text
                        style={[
                          styles.switcherText,
                          feedType === (tab === "Scrapbook" ? "Posts" : tab) &&
                            styles.switcherTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
        )}

        {/* MODAL: Filter */}
        <Modal visible={isFilterVisible} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={closeFilter}>
            <Animated.View
              style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.dragHandleWrap}>
                  <View style={styles.dragHandle} />
                </View>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Filter by Goals</Text>
                </View>
                <FlatList
                  data={MOCK_GOALS}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.filterRow}
                      onPress={() =>
                        setActiveFilterIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((f) => f !== item.id)
                            : [...prev, item.id],
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.filterRowText,
                          activeFilterIds.includes(item.id) &&
                            styles.filterRowTextActive,
                        ]}
                      >
                        {item.title}
                      </Text>
                      {activeFilterIds.includes(item.id) ? (
                        <Check color={C.blue} size={18} />
                      ) : (
                        <View style={styles.emptyCircle} />
                      )}
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.applyBtn} onPress={closeFilter}>
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* MODAL: Scrapbook Share Choices */}
        <Modal visible={isPostOptionsVisible} transparent animationType="fade">
          <Pressable
            style={styles.overlay}
            onPress={() => setIsPostOptionsVisible(false)}
          >
            <View style={styles.optionSheet}>
              <Text style={styles.sheetTitle}>Share Post</Text>
              <TouchableOpacity
                style={styles.optionBtn}
                onPress={() => {
                  setIsPostOptionsVisible(false);
                  openShareModal(selectedItem);
                }}
              >
                <Send
                  color={C.textPrimary}
                  size={20}
                  style={{ marginRight: 12 }}
                />
                <Text style={styles.optionBtnText}>Share as Post</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionBtn, { backgroundColor: C.accentLight }]}
                onPress={() => {
                  setIsPostOptionsVisible(false);
                  openShareModal({ ...selectedItem, mode: "AI_GEN" });
                }}
              >
                <Sparkles
                  color={C.accentDark}
                  size={20}
                  style={{ marginRight: 12 }}
                />
                <Text style={[styles.optionBtnText, { color: C.accentDark }]}>
                  Share as AI Event
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* MODAL: Share to Chats */}
        <Modal visible={isShareModalVisible} transparent animationType="none">
          <Pressable style={styles.overlay} onPress={closeShareModal}>
            <Animated.View
              style={[
                styles.sheet,
                { transform: [{ translateY: shareSlideAnim }] },
              ]}
            >
              <View style={styles.dragHandleWrap}>
                <View style={styles.dragHandle} />
              </View>
              <Text style={styles.sheetTitle}>Share to Group</Text>
              <FlatList
                data={availableChats}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.chatRow}
                    onPress={() => handleShareToChat(item.id)}
                  >
                    <View style={styles.chatAvatar}>
                      <Text style={styles.avatarText}>
                        {item.title.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.chatRowText}>{item.title}</Text>
                    <Send color={C.blue} size={18} />
                  </TouchableOpacity>
                )}
              />
            </Animated.View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoText: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: C.textPrimary,
  },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  iconBtn: { marginLeft: 18 },
  storiesRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  storyContainer: { alignItems: "center", marginRight: 16 },
  storyRing: {
    padding: 2,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: C.accentDark,
  },
  storyImage: { width: 62, height: 62, borderRadius: 31 },
  storyText: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "600",
    color: C.textPrimary,
  },
  switcher: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  switcherTab: { flex: 1, paddingVertical: 13, alignItems: "center" },
  switcherTabActive: { borderBottomWidth: 2, borderBottomColor: C.accentDark },
  switcherText: { fontSize: 14, fontWeight: "500", color: C.textMuted },
  switcherTextActive: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  loaderWrap: {
    marginTop: 50,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "600",
  },
  cardContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingBottom: 16,
    backgroundColor: C.surface,
  },
  cardHeader: { paddingHorizontal: 14, paddingVertical: 11 },
  cardUser: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  cardLocation: { fontSize: 12, color: C.textMuted, flex: 1 },
  cardImage: { width: "100%", height: 380, backgroundColor: C.accentLight },
  cardFooter: { paddingHorizontal: 14, paddingTop: 10 },
  eventTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 8,
    flex: 1,
  },
  deadlineBadge: {
    backgroundColor: C.redBg,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.redBorder,
    marginBottom: 12,
  },
  deadlineText: { color: C.red, fontSize: 11, fontWeight: "700" },
  lockBtn: {
    backgroundColor: C.accentLight,
    borderWidth: 1,
    borderColor: C.borderMid,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    height: 48,
    justifyContent: "center",
  },
  lockBtnText: { color: C.accentDark, fontWeight: "700", fontSize: 14 },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  postIconsLeft: { flexDirection: "row", alignItems: "center" },
  likesText: {
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 4,
    marginTop: 6,
    paddingHorizontal: 14,
  },
  captionText: {
    color: C.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
  },
  captionUser: { fontWeight: "700" },
  inspireBtn: {
    marginTop: 12,
    marginHorizontal: 14,
    backgroundColor: C.accentLight,
    borderWidth: 1,
    borderColor: C.borderMid,
    borderRadius: 10,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  inspireBtnText: {
    color: C.accentDark,
    fontSize: 13,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(26,24,20,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  optionSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  dragHandleWrap: { alignItems: "center", marginBottom: 14 },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 99,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  optionBtnText: { fontSize: 16, fontWeight: "600" },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#f5f2ef",
  },
  filterRowText: { fontSize: 15, color: C.textPrimary, fontWeight: "500" },
  filterRowTextActive: { color: C.blue, fontWeight: "700" },
  emptyCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: C.borderMid,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: C.bg,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accentLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: C.accentDark },
  chatRowText: { flex: 1, fontSize: 16, fontWeight: "500" },
  applyBtn: {
    backgroundColor: C.accentDark,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
