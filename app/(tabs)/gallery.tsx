import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
  SafeAreaView,
  Image,
  ScrollView,
  LayoutAnimation,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import {
  Users,
  Camera,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
  Bot,
  X,
  Send,
} from "lucide-react-native";
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
  green: "#4a7c59",
  greenBg: "#f0f7f2",
  greenBorder: "#c8dfd0",
  amber: "#9a7020",
  amberBg: "#fdf8f0",
  amberBorder: "#eddfbf",
  red: "#b84030",
  redBg: "#fff5f3",
  redBorder: "#f2d0c8",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type TabType = "Planned" | "Active" | "Completed";
const TABS: TabType[] = ["Planned", "Active", "Completed"];

interface ActionItem {
  id: string;
  title: string;
  statusText: string;
  participants: number;
  hasBadge?: boolean;
  photos?: string[];
}

type BucketListLite = {
  id: string;
  title: string;
};

type ConciergeCard = {
  title: string;
  location: string;
  hours: string;
  link: string;
  hype_message: string;
};

const TAB_CONFIG = {
  Planned: {
    color: C.amber,
    bg: C.amberBg,
    border: C.amberBorder,
    icon: (c: string) => <Users size={18} color={c} />,
    label: "Planned",
  },
  Active: {
    color: C.red,
    bg: C.redBg,
    border: C.redBorder,
    icon: (c: string) => <Camera size={18} color={c} />,
    label: "Active",
  },
  Completed: {
    color: C.green,
    bg: C.greenBg,
    border: C.greenBorder,
    icon: (c: string) => <Sparkles size={18} color={c} />,
    label: "Completed",
  },
};

// ─── Completed Card ───────────────────────────────────────────────────────────
function CompletedCard({ item }: { item: ActionItem }) {
  const [open, setOpen] = useState(false);
  const cfg = TAB_CONFIG.Completed;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View
      style={[
        styles.card,
        { borderColor: cfg.border, backgroundColor: cfg.bg },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={[styles.cardStatus, { color: cfg.color }]}>
            {item.statusText}
          </Text>
        </View>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          {cfg.icon(cfg.color)}
        </View>
      </View>

      <View style={styles.pillsRow}>
        <View
          style={[
            styles.pill,
            { backgroundColor: C.accentLight, borderColor: C.borderMid },
          ]}
        >
          <Users size={11} color={C.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.pillText, { color: C.accent }]}>
            {item.participants} people
          </Text>
        </View>
        {item.hasBadge && (
          <View
            style={[
              styles.pill,
              { backgroundColor: "#fdf8e8", borderColor: "#e8d88a" },
            ]}
          >
            <Award size={11} color="#8a7010" style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, { color: "#8a7010" }]}>
              Badge earned
            </Text>
          </View>
        )}
        {item.photos && item.photos.length > 0 && (
          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: cfg.bg, borderColor: cfg.border },
            ]}
            onPress={toggle}
            activeOpacity={0.7}
          >
            <Camera size={11} color={cfg.color} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, { color: cfg.color }]}>
              {item.photos.length} photos
            </Text>
            {open ? (
              <ChevronUp
                size={11}
                color={cfg.color}
                style={{ marginLeft: 3 }}
              />
            ) : (
              <ChevronDown
                size={11}
                color={cfg.color}
                style={{ marginLeft: 3 }}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {open && item.photos && (
        <View style={styles.galleryWrap}>
          <View style={styles.galleryDivider} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryScroll}
          >
            {item.photos.map((uri, idx) => (
              <View key={idx} style={styles.photoThumb}>
                <Image
                  source={{ uri }}
                  style={styles.photoImg}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Standard Card (Planned / Active) ─────────────────────────────────────────
function StandardCard({ item, tab }: { item: ActionItem; tab: TabType }) {
  const cfg = TAB_CONFIG[tab];
  return (
    <View
      style={[
        styles.card,
        { borderColor: cfg.border, backgroundColor: cfg.bg },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={[styles.cardStatus, { color: cfg.color }]}>
            {item.statusText}
          </Text>
        </View>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: C.surface, borderColor: cfg.border },
          ]}
        >
          {cfg.icon(cfg.color)}
        </View>
      </View>
      <View style={styles.pillsRow}>
        <View
          style={[
            styles.pill,
            { backgroundColor: C.accentLight, borderColor: C.borderMid },
          ]}
        >
          <Users size={11} color={C.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.pillText, { color: C.accent }]}>
            {item.participants} people
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GalleryScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("Planned");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // State for each category
  const [plannedEvents, setPlannedEvents] = useState<ActionItem[]>([]);
  const [activeEvents, setActiveEvents] = useState<ActionItem[]>([]);
  const [completedEvents, setCompletedEvents] = useState<ActionItem[]>([]);

  // Concierge UI state
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [bucketListItems, setBucketListItems] = useState<BucketListLite[]>([]);
  const [selectedBucketItemId, setSelectedBucketItemId] = useState<
    string | null
  >(null);
  const [selectedBucketItemTitle, setSelectedBucketItemTitle] = useState("");
  const [conciergeResults, setConciergeResults] = useState<ConciergeCard[]>([]);
  const [isConciergeLoading, setIsConciergeLoading] = useState(false);
  const [isAcceptingConcierge, setIsAcceptingConcierge] = useState(false);

  const mapEventsToTabs = (data: any[]) => {
    const planned: ActionItem[] = [];
    const active: ActionItem[] = [];
    const completed: ActionItem[] = [];

    data.forEach((dbItem) => {
      const mappedItem: ActionItem = {
        id: dbItem.id,
        title: dbItem.title,
        statusText: dbItem.status_text || "No status",
        participants: dbItem.participants || 1,
        hasBadge: dbItem.has_badge,
        photos: dbItem.photos || [],
      };

      if (dbItem.completed) {
        completed.push(mappedItem);
      } else if (dbItem.is_active) {
        active.push(mappedItem);
      } else {
        planned.push(mappedItem);
      }
    });

    setPlannedEvents(planned);
    setActiveEvents(active);
    setCompletedEvents(completed);
  };

  const fetchEvents = async (uid: string) => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return;
    }

    mapEventsToTabs(data || []);
  };

  useEffect(() => {
    const loadActionCenterData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data: listData } = await supabase
        .from("bucket_list_items")
        .select("id, title")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setBucketListItems((listData || []) as BucketListLite[]);

      await fetchEvents(session.user.id);
      setIsLoading(false);
    };

    loadActionCenterData();
  }, []);

  const callConcierge = async () => {
    if (!userId) return;
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!apiBase) {
      console.error("EXPO_PUBLIC_API_BASE_URL is not set");
      return;
    }

    const trimmedRequest = requestText.trim();
    if (!selectedBucketItemId && !trimmedRequest) return;

    try {
      setIsConciergeLoading(true);

      const endpoint = selectedBucketItemId
        ? `${apiBase}/api/plan-bucket-from-list`
        : `${apiBase}/api/concierge/plan-bucket`;

      const payload = selectedBucketItemId
        ? { user_id: userId, bucket_list_item_id: selectedBucketItemId }
        : { user_id: userId, request_text: trimmedRequest };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body?.detail || "Concierge request failed");

      const rows: ConciergeCard[] = Array.isArray(body?.data) ? body.data : [];
      setConciergeResults(rows);
    } catch (err) {
      console.error("Concierge call failed:", err);
    } finally {
      setIsConciergeLoading(false);
    }
  };

  const removeConciergeResult = (index: number) => {
    setConciergeResults((prev) => prev.filter((_, i) => i !== index));
  };

  const acceptConciergeBuckets = async () => {
    if (!userId || conciergeResults.length === 0) return;
    try {
      setIsAcceptingConcierge(true);
      const rows = conciergeResults.map((item) => ({
        user_id: userId,
        title: item.title,
        status_text: item.hype_message || `Planned near ${item.location}`,
        participants: 1,
        is_active: false,
        completed: false,
      }));

      const { error } = await supabase.from("events").insert(rows);
      if (error) throw error;

      await fetchEvents(userId);
      setActiveTab("Planned");
      setConciergeResults([]);
      setRequestText("");
      setSelectedBucketItemId(null);
      setSelectedBucketItemTitle("");
      setIsConciergeOpen(false);
    } catch (err) {
      console.error("Failed to save concierge buckets:", err);
    } finally {
      setIsAcceptingConcierge(false);
    }
  };

  const getActiveData = () => {
    switch (activeTab) {
      case "Planned":
        return plannedEvents;
      case "Active":
        return activeEvents;
      case "Completed":
        return completedEvents;
      default:
        return [];
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<ActionItem>) =>
    activeTab === "Completed" ? (
      <CompletedCard item={item} />
    ) : (
      <StandardCard item={item} tab={activeTab} />
    );

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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>OVERVIEW</Text>
          <Text style={styles.headerTitle}>Action Center</Text>
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab;
            const cfg = TAB_CONFIG[tab];
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  active && {
                    borderBottomColor: cfg.color,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    active && { color: cfg.color, fontWeight: "700" },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={getActiveData()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No {activeTab.toLowerCase()} events right now.
            </Text>
          }
        />

        {/* Concierge Bubble */}
        {!isConciergeOpen && (
          <TouchableOpacity
            style={styles.conciergeFab}
            onPress={() => setIsConciergeOpen(true)}
            activeOpacity={0.9}
          >
            <Bot color="#fff" size={20} />
          </TouchableOpacity>
        )}

        {/* Concierge Panel */}
        {isConciergeOpen && (
          <View style={styles.conciergePanel}>
            <View style={styles.conciergeHeader}>
              <Text style={styles.conciergeTitle}>Concierge</Text>
              <TouchableOpacity onPress={() => setIsConciergeOpen(false)}>
                <X color={C.textMuted} size={18} />
              </TouchableOpacity>
            </View>

            <Text style={styles.conciergePrompt}>
              What would you like to do?
            </Text>

            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setIsPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText}>
                {selectedBucketItemTitle ||
                  "Pick a bucket list item (optional)"}
              </Text>
              <ChevronDown size={14} color={C.textMuted} />
            </TouchableOpacity>

            <TextInput
              value={requestText}
              onChangeText={setRequestText}
              placeholder="Or type your own request"
              placeholderTextColor={C.textLight}
              style={styles.conciergeInput}
            />

            <TouchableOpacity
              style={[
                styles.conciergeSendBtn,
                isConciergeLoading && { opacity: 0.7 },
              ]}
              onPress={callConcierge}
              disabled={isConciergeLoading}
            >
              {isConciergeLoading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text
                    style={[styles.conciergeSendBtnText, { marginLeft: 8 }]}
                  >
                    Searching, this may take a while
                  </Text>
                </>
              ) : (
                <>
                  <Send color="#fff" size={14} style={{ marginRight: 6 }} />
                  <Text style={styles.conciergeSendBtnText}>Find options</Text>
                </>
              )}
            </TouchableOpacity>

            {conciergeResults.length > 0 && (
              <ScrollView
                style={styles.conciergeResultList}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {conciergeResults.map((item, idx) => (
                  <View
                    key={`${item.title}-${idx}`}
                    style={styles.conciergeResultCard}
                  >
                    <View style={styles.conciergeResultHeader}>
                      <Text style={styles.conciergeResultTitle}>
                        {item.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeConciergeResult(idx)}
                      >
                        <X color={C.textMuted} size={14} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.conciergeResultMeta}>
                      {item.location}
                    </Text>
                    <Text style={styles.conciergeResultMeta}>{item.hours}</Text>
                    <Text style={styles.conciergeResultHype}>
                      {item.hype_message}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.acceptBucketsBtn,
                (conciergeResults.length === 0 || isAcceptingConcierge) && {
                  opacity: 0.6,
                },
              ]}
              disabled={conciergeResults.length === 0 || isAcceptingConcierge}
              onPress={acceptConciergeBuckets}
            >
              {isAcceptingConcierge ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.acceptBucketsBtnText}>Accept Buckets</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bucket List Picker */}
        <Modal
          visible={isPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPickerOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsPickerOpen(false)}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Choose Bucket List Item</Text>
              <ScrollView style={{ maxHeight: 260 }}>
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedBucketItemId(null);
                    setSelectedBucketItemTitle("");
                    setIsPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>None</Text>
                </TouchableOpacity>
                {bucketListItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedBucketItemId(item.id);
                      setSelectedBucketItemTitle(item.title);
                      setIsPickerOpen(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: C.textLight,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.6,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: C.border,
    marginTop: 16,
    backgroundColor: C.bg,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textMuted,
    letterSpacing: 0.1,
  },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  emptyText: {
    textAlign: "center",
    marginTop: 48,
    color: C.textLight,
    fontSize: 14,
    fontStyle: "italic",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    backgroundColor: C.surface,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: { flex: 1, marginRight: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 5,
    lineHeight: 22,
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
  galleryWrap: { marginTop: 14 },
  galleryDivider: { height: 1, backgroundColor: C.border, marginBottom: 14 },
  galleryScroll: { paddingBottom: 2 },
  photoThumb: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginRight: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  photoImg: { width: "100%", height: "100%" },

  conciergeFab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.accentDark,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  conciergePanel: {
    position: "absolute",
    right: 16,
    bottom: 20,
    width: "88%",
    maxHeight: "70%",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  conciergeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  conciergeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
  },
  conciergePrompt: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 8,
  },
  dropdownText: {
    flex: 1,
    marginRight: 8,
    fontSize: 13,
    color: C.textPrimary,
  },
  conciergeInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    color: C.textPrimary,
    marginBottom: 8,
  },
  conciergeSendBtn: {
    backgroundColor: C.accentDark,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  conciergeSendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  conciergeResultList: {
    maxHeight: 210,
    marginBottom: 10,
  },
  conciergeResultCard: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  conciergeResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conciergeResultTitle: {
    flex: 1,
    marginRight: 8,
    color: C.textPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  conciergeResultMeta: {
    color: C.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  conciergeResultHype: {
    color: C.accent,
    fontSize: 12,
    marginTop: 4,
  },
  acceptBucketsBtn: {
    backgroundColor: C.green,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBucketsBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26,24,20,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalItemText: {
    color: C.textPrimary,
    fontSize: 14,
  },
});
