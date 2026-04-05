import React, { useState, useRef } from 'react';
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
  ListRenderItemInfo,
} from 'react-native';
import { useFonts } from 'expo-font';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BucketItem {
  id: string;
  title: string;
  category: string;
  deadline: string;
  urgency: 'high' | 'medium' | 'low';
  completed: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_ORDER = { high: 0, medium: 1, low: 2 };

const URGENCY_COLORS = {
  high: {
    card: '#fff5f3',
    border: '#f2d0c8',
    accent: '#b84030',
    category: '#c06050',
  },
  medium: {
    card: '#fdf8f0',
    border: '#eddfbf',
    accent: '#9a7020',
    category: '#b08030',
  },
  low: {
    card: '#ffffff',
    border: '#e8e2db',
    accent: '#a09890',
    category: '#b0a898',
  },
};

const INITIAL_GOALS: BucketItem[] = [
  { id: '1', title: 'Learn to Surf', category: 'Health & Fitness', deadline: 'End of Summer', urgency: 'high', completed: false },
  { id: '2', title: 'Build an AI Hardware Project', category: 'Career & Skills', deadline: 'Before next Hackathon', urgency: 'medium', completed: false },
  { id: '3', title: 'Hike Yosemite Half Dome', category: 'Travel & Adventure', deadline: 'Next Year', urgency: 'low', completed: false },
];

const AI_SUGGESTIONS = [
  { title: 'Try Bouldering at a Local Gym', category: 'Health & Fitness', deadline: 'This Month', urgency: 'medium' as const },
  { title: 'Cook a 3-Course Meal from Scratch', category: 'Life Skills', deadline: 'Next Weekend', urgency: 'high' as const },
  { title: 'Attend a Local Tech Meetup', category: 'Career & Skills', deadline: 'Next 14 Days', urgency: 'medium' as const },
  { title: 'Write a Letter to Future Self', category: 'Personal Growth', deadline: 'This Month', urgency: 'low' as const },
  { title: 'Watch All Kurosawa Films', category: 'Culture', deadline: 'This Year', urgency: 'low' as const },
  { title: 'Run a 5K Without Stopping', category: 'Health & Fitness', deadline: 'Next 3 Months', urgency: 'medium' as const },
  { title: 'Learn One Song on Guitar', category: 'Creative', deadline: 'Next Month', urgency: 'high' as const },
];

// ─── Animated Card ────────────────────────────────────────────────────────────

function GoalCard({
  item,
  onToggle,
  onRemove,
}: {
  item: BucketItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const colors = URGENCY_COLORS[item.urgency];

  const handleRemove = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 60, duration: 280, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onRemove(item.id));
  };

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
      {/* Top row */}
      <View style={styles.cardTop}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => onToggle(item.id)}
          activeOpacity={0.7}
          style={[
            styles.checkbox,
            { borderColor: colors.accent },
            item.completed && { backgroundColor: colors.accent },
          ]}
        >
          {item.completed && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>

        {/* Text */}
        <View style={styles.cardInfo}>
          <Text
            style={[
              styles.cardTitle,
              item.completed && styles.cardTitleDone,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={[styles.cardCategory, { color: colors.category }]}>
            {item.category.toUpperCase()}
          </Text>
        </View>

        {/* Remove button */}
        <TouchableOpacity
          onPress={handleRemove}
          activeOpacity={0.6}
          style={styles.removeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      {!item.completed && (
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.deadlineRow}>
            <View style={[styles.deadlineDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.deadlineText, { color: colors.accent }]}>
              {item.deadline}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.planBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
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
  const [goals, setGoals] = useState<BucketItem[]>(INITIAL_GOALS);
  const [inputText, setInputText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const usedSuggestions = useRef<Set<number>>(new Set());

  const sortedGoals = [...goals].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
  });

  const completedCount = goals.filter(g => g.completed).length;
  const progressPct = goals.length ? completedCount / goals.length : 0;

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const addGoal = (title: string, category = 'Personal Goal', deadline = 'No deadline', urgency: BucketItem['urgency'] = 'low') => {
    const newGoal: BucketItem = {
      id: Date.now().toString(),
      title,
      category,
      deadline,
      urgency,
      completed: false,
    };
    setGoals(prev => [newGoal, ...prev]);
  };

  const handleAdd = () => {
    if (!inputText.trim()) return;
    addGoal(inputText.trim());
    setInputText('');
  };

  const handleAISuggest = () => {
    if (aiLoading) return;
    setAiLoading(true);
    const available = AI_SUGGESTIONS.filter((_, i) => !usedSuggestions.current.has(i));
    if (available.length === 0) usedSuggestions.current.clear();
    const pool = AI_SUGGESTIONS.filter((_, i) => !usedSuggestions.current.has(i));
    const idx = Math.floor(Math.random() * pool.length);
    const pick = pool[idx];
    usedSuggestions.current.add(AI_SUGGESTIONS.indexOf(pick));
    setTimeout(() => {
      addGoal(pick.title, pick.category, pick.deadline, pick.urgency);
      setAiLoading(false);
    }, 700);
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<BucketItem>) => {
    const prevItem = sortedGoals[index - 1];
    const showDivider = item.completed && (!prevItem || !prevItem.completed);
    return (
      <>
        {showDivider && (
          <Text style={styles.sectionLabel}>Completed</Text>
        )}
        <GoalCard item={item} onToggle={toggleGoal} onRemove={removeGoal} />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MY GOALS</Text>
          <Text style={styles.title}>Bucket List</Text>
          <Text style={styles.subtitle}>Life's too short to leave it blank</Text>

          {/* Progress */}
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
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
            </View>
          </View>
        </View>

        {/* ── Input ── */}
        <View style={styles.inputArea}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Add a new dream..."
              placeholderTextColor="#c8c0b6"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.7}
              style={styles.addBtn}
              disabled={!inputText.trim()}
            >
              <Text style={[styles.addBtnText, !inputText.trim() && { color: '#c8c0b6' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── AI Button ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleAISuggest}
            activeOpacity={0.7}
            style={[styles.aiBtn, aiLoading && styles.aiBtnDisabled]}
            disabled={aiLoading}
          >
            <Text style={styles.aiBtnText}>
              {aiLoading ? 'Thinking...' : '✦  Suggest with AI'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── List ── */}
        <FlatList
          data={sortedGoals}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Your list is empty — dream bigger.</Text>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f7f5f2',
  },
  container: {
    flex: 1,
    backgroundColor: '#f7f5f2',
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: '#b0aa9f',
    marginBottom: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: '300',
    color: '#1a1814',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 13,
    color: '#a09890',
    marginTop: 4,
    fontWeight: '400',
  },
  progressSection: {
    marginTop: 18,
    marginBottom: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: '#c0b9b0',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#e8e3dc',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7a6e62',
    borderRadius: 99,
  },

  // Input
  inputArea: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4dfd8',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    height: 38,
    fontSize: 14,
    color: '#1a1814',
    fontWeight: '400',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ede9e3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 22,
    color: '#6b6055',
    lineHeight: 26,
    fontWeight: '300',
  },

  // AI Button
  actionsRow: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  aiBtn: {
    alignSelf: 'flex-start',
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4dfd8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtnDisabled: {
    opacity: 0.5,
  },
  aiBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a6e62',
    letterSpacing: 0.3,
  },

  // List
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 9,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.0,
    color: '#c0b8b0',
    textTransform: 'uppercase',
    paddingTop: 8,
    paddingBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    paddingTop: 48,
    color: '#c8c0b6',
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 13,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1814',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: '#bbb4aa',
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 3,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -1,
  },
  removeBtnText: {
    fontSize: 11,
    color: '#9a9088',
    fontWeight: '500',
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deadlineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  planBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  planBtnText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});