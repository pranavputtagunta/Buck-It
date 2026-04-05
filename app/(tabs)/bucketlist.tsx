import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../app/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BucketItem {
  id: string;
  title: string;
  category: string;
  tags?: string[];
  deadline: string | null;
  urgency: "high" | "medium" | "low";
  completed: boolean;
}

const URGENCY_ORDER = { high: 0, medium: 1, low: 2 };
const URGENCY_COLORS = {
  high: {
    card: "#fff5f3",
    border: "#f2d0c8",
    accent: "#b84030",
    category: "#c06050",
    tagBg: "#fae4df",
  },
  medium: {
    card: "#fdf8f0",
    border: "#eddfbf",
    accent: "#9a7020",
    category: "#b08030",
    tagBg: "#f2ebd9",
  },
  low: {
    card: "#ffffff",
    border: "#e8e2db",
    accent: "#a09890",
    category: "#b0a898",
    tagBg: "#f2f0ec",
  },
};

const AI_SUGGESTIONS = [
  {
    title: "Try Bouldering at a Local Gym",
    deadline: null,
    urgency: "medium" as const,
  },
  {
    title: "Cook a 3-Course Meal from Scratch",
    deadline: null,
    urgency: "high" as const,
  },
  {
    title: "Attend a Local Tech Meetup",
    deadline: null,
    urgency: "medium" as const,
  },
];

const isValidDate = (dateString: string) => {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false;
  const d = new Date(dateString);
  const dNum = d.getTime();
  if (!dNum && dNum !== 0) return false;
  return d.toISOString().slice(0, 10) === dateString;
};

// ─── Animated Card ────────────────────────────────────────────────────────────

function GoalCard({
  item,
  onToggle,
  onRemove,
  onFindPlan,
}: {
  item: BucketItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onFindPlan: (item: BucketItem) => void;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const colors = URGENCY_COLORS[item.urgency || "low"];

  const handleRemove = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 60,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onRemove(item.id));
  };

  const displayTags =
    item.tags && item.tags.length > 0
      ? item.tags
      : [item.category || "General"];

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        },
        item.completed && styles.cardCompleted,
      ]}
    >
      <View style={styles.cardTop}>
        <TouchableOpacity
          onPress={() => onToggle(item.id)}
          activeOpacity={0.7}
          style={[
            styles.checkbox,
            { borderColor: colors.accent },
            item.completed && { backgroundColor: colors.accent },
          ]}
        >
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardTitle, item.completed && styles.cardTitleDone]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={styles.tagContainer}>
            {displayTags.map((tag, idx) => (
              <View
                key={idx}
                style={[styles.tagPill, { backgroundColor: colors.tagBg }]}
              >
                <Text style={[styles.cardCategory, { color: colors.category }]}>
                  {tag.toUpperCase().replace("_", " ")}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRemove}
          activeOpacity={0.6}
          style={styles.removeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {!item.completed && (
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.deadlineRow}>
            <View
              style={[styles.deadlineDot, { backgroundColor: colors.accent }]}
            />
            <Text style={[styles.deadlineText, { color: colors.accent }]}>
              {item.deadline || "No Deadline"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.planBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => onFindPlan(item)}
          >
            <Text style={[styles.planBtnText, { color: colors.accent }]}>
              Find a plan →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BucketListScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [goals, setGoals] = useState<BucketItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [deadlineText, setDeadlineText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const usedSuggestions = useRef<Set<number>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }
      setUserId(session.user.id);

      // 🚨 FIX: Removed 'category' from the select statement
      const { data, error } = await supabase
        .from("bucket_list_items")
        .select("id, title, tags, deadline, completed, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching buckets:", error.message);
      } else if (data) {
        setGoals(
          data.map((dbItem) => ({
            id: dbItem.id,
            title: dbItem.title,
            // 🚨 FIX: Derive category from tags array to prevent UI crashing
            category: dbItem.tags?.[0] || "General",
            tags: dbItem.tags || [],
            deadline: dbItem.deadline,
            urgency: "low",
            completed: dbItem.completed || false,
          })),
        );
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const sortedGoals = [...goals].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (
      URGENCY_ORDER[a.urgency || "low"] - URGENCY_ORDER[b.urgency || "low"]
    );
  });

  const completedCount = goals.filter((g) => g.completed).length;
  const progressPct = goals.length ? completedCount / goals.length : 0;

  const toggleGoal = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    const newStatus = !goal.completed;
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: newStatus } : g)),
    );
    const { error } = await supabase
      .from("bucket_list_items")
      .update({ completed: newStatus })
      .eq("id", id);
    if (error) {
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, completed: !newStatus } : g)),
      );
      Alert.alert("Error", error.message);
    }
  };

  const removeGoal = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("bucket_list_items").delete().eq("id", id);
  };

  const addGoal = async (
    title: string,
    deadlineString: string | null = null,
    urgency: BucketItem["urgency"] = "low",
  ) => {
    if (!userId) return;
    setIsAdding(true);
    const safeDeadline =
      deadlineString && isValidDate(deadlineString) ? deadlineString : null;
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;

    try {
      const response = await fetch(`${apiBase}/api/buckets/list-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title: title,
          deadline: safeDeadline,
        }),
      });

      if (!response.ok) throw new Error("Failed to sync bucket item");
      const data = await response.json();

      setGoals((prev) => [
        {
          id: data.id,
          title: data.title,
          category: data.category || data.tags?.[0] || "General",
          tags: data.tags || [],
          deadline: data.deadline,
          urgency: urgency,
          completed: data.completed,
        },
        ...prev,
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAdd = () => {
    if (!inputText.trim() || isAdding) return;
    addGoal(inputText.trim(), deadlineText.trim());
    setInputText("");
    setDeadlineText("");
  };

  const handleAISuggest = () => {
    if (aiLoading) return;
    setAiLoading(true);
    const pool = AI_SUGGESTIONS.filter(
      (_, i) => !usedSuggestions.current.has(i),
    );
    if (pool.length === 0) {
      usedSuggestions.current.clear();
      setAiLoading(false);
      return;
    }
    const idx = Math.floor(Math.random() * pool.length);
    const pick = pool[idx];
    usedSuggestions.current.add(AI_SUGGESTIONS.indexOf(pick));
    addGoal(pick.title, pick.deadline, pick.urgency).then(() =>
      setAiLoading(false),
    );
  };

  const handleFindPlan = (item: BucketItem) => {
    router.push({
      pathname: "/(tabs)/gallery",
      params: {
        conciergeOpen: "1",
        bucketItemId: item.id,
        bucketItemTitle: item.title,
      },
    });
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MY GENERAL PLANS</Text>
          <Text style={styles.title}>General Plans</Text>
          <Text style={styles.subtitle}>
            Life is too short to leave it blank
          </Text>
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>
                {completedCount} of {goals.length} complete
              </Text>
              <Text style={styles.progressLabel}>
                {Math.round(progressPct * 100)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPct * 100}%` as any },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputArea}>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.inputTitle}
              placeholder="Add a new dream..."
              placeholderTextColor="#a09890"
              value={inputText}
              onChangeText={setInputText}
              editable={!isAdding}
            />
            <View style={styles.inputRowBottom}>
              <TextInput
                style={styles.inputDeadline}
                placeholder="YYYY-MM-DD (Optional)"
                placeholderTextColor="#c8c0b6"
                value={deadlineText}
                onChangeText={setDeadlineText}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
                editable={!isAdding}
              />
              <TouchableOpacity
                onPress={handleAdd}
                activeOpacity={0.7}
                style={styles.addBtn}
                disabled={!inputText.trim() || isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="#6b6055" />
                ) : (
                  <Text
                    style={[
                      styles.addBtnText,
                      !inputText.trim() && { color: "#c8c0b6" },
                    ]}
                  >
                    +
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleAISuggest}
            activeOpacity={0.7}
            style={[styles.aiBtn, aiLoading && styles.aiBtnDisabled]}
            disabled={aiLoading}
          >
            <Text style={styles.aiBtnText}>
              {aiLoading ? "Thinking..." : "✦  Suggest with AI"}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={sortedGoals}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const prevItem = sortedGoals[index - 1];
            const showDivider =
              item.completed && (!prevItem || !prevItem.completed);
            return (
              <>
                {showDivider && (
                  <Text style={styles.sectionLabel}>Completed</Text>
                )}
                <GoalCard
                  item={item}
                  onToggle={toggleGoal}
                  onRemove={removeGoal}
                  onFindPlan={handleFindPlan}
                />
              </>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Your list is empty — dream bigger.
            </Text>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f5f2" },
  container: { flex: 1, backgroundColor: "#f7f5f2" },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: "#b0aa9f",
    marginBottom: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: "300",
    color: "#1a1814",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: { fontSize: 13, color: "#a09890", marginTop: 4, fontWeight: "400" },
  progressSection: { marginTop: 18, marginBottom: 4 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: "#c0b9b0",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "#e8e3dc",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7a6e62",
    borderRadius: 99,
  },
  inputArea: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  inputCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4dfd8",
    padding: 12,
  },
  inputTitle: {
    fontSize: 16,
    color: "#1a1814",
    fontWeight: "500",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  inputRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputDeadline: {
    flex: 1,
    backgroundColor: "#f7f5f2",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    fontSize: 13,
    color: "#1a1814",
    marginRight: 10,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ede9e3",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    fontSize: 22,
    color: "#6b6055",
    lineHeight: 26,
    fontWeight: "300",
  },
  actionsRow: { paddingHorizontal: 24, marginBottom: 8 },
  aiBtn: {
    alignSelf: "flex-start",
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e4dfd8",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBtnDisabled: { opacity: 0.5 },
  aiBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a6e62",
    letterSpacing: 0.3,
  },
  list: { paddingHorizontal: 24, paddingBottom: 40, gap: 9 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.0,
    color: "#c0b8b0",
    textTransform: "uppercase",
    paddingTop: 8,
    paddingBottom: 4,
  },
  emptyText: {
    textAlign: "center",
    paddingTop: 48,
    color: "#c8c0b6",
    fontSize: 14,
    fontStyle: "italic",
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden", padding: 13 },
  cardCompleted: { opacity: 0.7 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { fontSize: 11, color: "#fff", fontWeight: "600", lineHeight: 14 },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1814",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardTitleDone: { textDecorationLine: "line-through", color: "#bbb4aa" },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardCategory: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -1,
  },
  removeBtnText: { fontSize: 11, color: "#9a9088", fontWeight: "500" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  deadlineDot: { width: 5, height: 5, borderRadius: 3 },
  deadlineText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  planBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  planBtnText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
});
