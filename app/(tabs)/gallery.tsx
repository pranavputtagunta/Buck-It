import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ListRenderItemInfo, SafeAreaView } from 'react-native';
import { Users, Camera, Sparkles } from 'lucide-react-native';

type TabType = 'Planned' | 'Active' | 'Completed';
const TABS: TabType[] = ['Planned', 'Active', 'Completed'];

interface ActionItem {
  id: string;
  title: string;
  statusText: string;
  participants: number;
}

// Data organized by the three states
const MOCK_DATA: Record<TabType, ActionItem[]> = {
  Planned: [
    { id: '1', title: 'Sunset Kayaking at La Jolla', statusText: 'Awaiting RSVPs - AI handling invites', participants: 4 },
  ],
  Active: [
    { id: '2', title: 'UCSD Hackathon Team-up', statusText: 'Happening Now - Drop photos here!', participants: 3 },
  ],
  Completed: [
    { id: '3', title: 'Torrey Pines Morning Hike', statusText: 'Scrapbook Generated - Badges Awarded', participants: 6 },
    { id: '4', title: 'Intro to Robotics Workshop', statusText: 'Scrapbook Generated', participants: 12 },
  ]
};

export default function GalleryScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('Planned');

  const getStatusIcon = (tab: TabType) => {
    switch (tab) {
      case 'Planned': return <Users size={20} color="#000" />;
      case 'Active': return <Camera size={20} color="#000" />;
      case 'Completed': return <Sparkles size={20} color="#000" />;
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<ActionItem>) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {getStatusIcon(activeTab)}
      </View>
      <Text style={styles.cardStatus}>{item.statusText}</Text>
      
      <View style={styles.participantPill}>
        <Text style={styles.participantText}>{item.participants} people</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Action Center</Text>
        
        {/* Custom Tab Switcher */}
        <View style={styles.tabContainer}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dynamic List based on State */}
        <FlatList
          data={MOCK_DATA[activeTab]}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Nothing here yet.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  headerTitle: { fontSize: 28, fontWeight: '900', paddingHorizontal: 16, marginTop: 12, marginBottom: 16, letterSpacing: -0.5 },
  
  // Tab Switcher Styles
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#eee', marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#000' },
  tabText: { fontSize: 15, color: '#888', fontWeight: '600' },
  activeTabText: { color: '#000', fontWeight: '800' },
  
  // List Styles
  listContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { padding: 20, backgroundColor: '#f8f8f8', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', flex: 1, marginRight: 12 },
  cardStatus: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  participantPill: { alignSelf: 'flex-start', backgroundColor: '#e6e6e6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  participantText: { fontSize: 12, fontWeight: '600', color: '#333' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 16 },
});