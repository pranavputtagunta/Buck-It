import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ListRenderItemInfo, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, LayoutAnimation } from 'react-native';
import { Target, Clock, ArrowRight, Circle, CheckCircle2, Sparkles, Plus } from 'lucide-react-native';

interface BucketItem {
  id: string;
  title: string;
  category: string;
  deadline: string;
  urgency: 'high' | 'medium' | 'low';
  completed: boolean;
}

const INITIAL_GOALS: BucketItem[] = [
  { id: '1', title: 'Learn to Surf', category: 'Health & Fitness', deadline: 'End of Summer', urgency: 'high', completed: false },
  { id: '2', title: 'Build an AI Hardware Project', category: 'Career & Skills', deadline: 'Before next Hackathon', urgency: 'medium', completed: false },
  { id: '3', title: 'Hike Yosemite Half Dome', category: 'Travel & Adventure', deadline: 'Next Year', urgency: 'low', completed: false },
];

// Mock AI Suggestions to simulate the Gemini API response
const AI_SUGGESTIONS = [
  { title: 'Try Bouldering at a Local Gym', category: 'Health & Fitness', deadline: 'This Month', urgency: 'medium' },
  { title: 'Cook a 3-Course Meal', category: 'Life Skills', deadline: 'Next Weekend', urgency: 'high' },
  { title: 'Attend a Local Tech Meetup', category: 'Career & Skills', deadline: 'Next 14 Days', urgency: 'medium' },
];

export default function BucketListScreen() {
  const [goals, setGoals] = useState<BucketItem[]>(INITIAL_GOALS);
  const [inputText, setInputText] = useState('');

  const toggleComplete = (id: string) => {
    // Smooth layout animation for UI polish
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const addManualGoal = () => {
    if (!inputText.trim()) return;
    
    const newGoal: BucketItem = {
      id: Date.now().toString(),
      title: inputText,
      category: 'Personal Goal',
      deadline: 'Set a deadline',
      urgency: 'low',
      completed: false,
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setGoals([newGoal, ...goals]);
    setInputText('');
  };

  const suggestAIGoal = () => {
    // Simulate API call delay and grab a random suggestion
    const randomSuggestion = AI_SUGGESTIONS[Math.floor(Math.random() * AI_SUGGESTIONS.length)];
    
    const newGoal: BucketItem = {
      id: Date.now().toString(),
      title: randomSuggestion.title,
      category: randomSuggestion.category,
      deadline: randomSuggestion.deadline,
      urgency: randomSuggestion.urgency as 'high' | 'medium' | 'low',
      completed: false,
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setGoals([newGoal, ...goals]);
  };

  const renderGoal = ({ item }: ListRenderItemInfo<BucketItem>) => (
    <View style={[styles.card, item.completed && styles.cardCompleted]}>
      {/* Top Row: Checkmark and Title */}
      <View style={styles.cardMain}>
        <TouchableOpacity 
          onPress={() => toggleComplete(item.id)} 
          style={styles.checkboxContainer}
          activeOpacity={0.7}
        >
          {item.completed ? (
            <CheckCircle2 color="#000" size={28} fill="#e6e6e6" />
          ) : (
            <Circle color="#ccc" size={28} />
          )}
        </TouchableOpacity>
        
        <View style={styles.cardTextContainer}>
          <Text style={[styles.title, item.completed && styles.titleCompleted]}>
            {item.title}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
      </View>
      
      {/* Bottom Row: Deadline and Action */}
      {!item.completed && (
        <View style={styles.footer}>
          <View style={styles.deadlineRow}>
            <Clock color={item.urgency === 'high' ? '#ff4d4d' : '#888'} size={14} />
            <Text style={[styles.deadlineText, item.urgency === 'high' && styles.urgentText]}>
              {item.deadline}
            </Text>
          </View>
          <TouchableOpacity style={styles.findEventBtn} activeOpacity={0.8}>
            <Text style={styles.findEventText}>Find Plan</Text>
            <ArrowRight color="#fff" size={14} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bucket List</Text>
          <Text style={styles.subHeader}>Track and accomplish your life goals</Text>
        </View>

        {/* Input & AI Generation Row */}
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Add a new goal..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={addManualGoal}
            />
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={addManualGoal}
              disabled={!inputText.trim()}
            >
              <Plus color={inputText.trim() ? "#000" : "#ccc"} size={24} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.aiButton} onPress={suggestAIGoal} activeOpacity={0.8}>
            <Sparkles color="#fff" size={20} />
            <Text style={styles.aiButtonText}>Ask AI</Text>
          </TouchableOpacity>
        </View>
        
        {/* The List */}
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoal}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, marginTop: 12 },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: '#000' },
  subHeader: { fontSize: 16, color: '#666', marginTop: 4, marginBottom: 16 },
  
  // Input Section
  inputSection: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 20, alignItems: 'center' },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 24, paddingRight: 8, marginRight: 12 },
  input: { flex: 1, height: 48, paddingHorizontal: 16, fontSize: 16, color: '#000' },
  addButton: { padding: 8 },
  aiButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', height: 48, paddingHorizontal: 16, borderRadius: 24 },
  aiButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  
  // List Styles
  listContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  cardCompleted: { backgroundColor: '#fafafa', borderColor: '#f0f0f0' },
  
  cardMain: { flexDirection: 'row', alignItems: 'flex-start' },
  checkboxContainer: { marginRight: 12, marginTop: 2 },
  cardTextContainer: { flex: 1 },
  
  title: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 6 },
  titleCompleted: { color: '#aaa', textDecorationLine: 'line-through' },
  
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#666' },
  
  // Footer / Action Styles
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 12, marginTop: 12, marginLeft: 40 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center' },
  deadlineText: { marginLeft: 4, fontSize: 13, color: '#888', fontWeight: '500' },
  urgentText: { color: '#ff4d4d', fontWeight: '700' },
  findEventBtn: { backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  findEventText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});