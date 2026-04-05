import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Users, Camera, Sparkles, ChevronDown, ChevronUp, Award } from 'lucide-react-native';
import { supabase } from '../../app/lib/supabase';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          '#f7f5f2', surface:     '#ffffff', border:      '#e8e3dc',
  borderMid:   '#ddd6cc', textPrimary: '#1a1814', textMuted:   '#a09890',
  textLight:   '#c0b9b0', accent:      '#7a6e62', accentDark:  '#3a342e',
  accentLight: '#ede9e3', green:       '#4a7c59', greenBg:     '#f0f7f2',
  greenBorder: '#c8dfd0', amber:       '#9a7020', amberBg:     '#fdf8f0',
  amberBorder: '#eddfbf', red:         '#b84030', redBg:       '#fff5f3',
  redBorder:   '#f2d0c8',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type TabType = 'Planned' | 'Active' | 'Completed';
const TABS: TabType[] = ['Planned', 'Active', 'Completed'];

interface ActionItem {
  id: string;
  title: string;
  statusText: string;
  participants: number;
  hasBadge?: boolean;
  photos?: string[];
}

const TAB_CONFIG = {
  Planned:   { color: C.amber, bg: C.amberBg, border: C.amberBorder, icon: (c: string) => <Users   size={18} color={c} />, label: 'Planned'   },
  Active:    { color: C.red,   bg: C.redBg,   border: C.redBorder,   icon: (c: string) => <Camera  size={18} color={c} />, label: 'Active'    },
  Completed: { color: C.green, bg: C.greenBg, border: C.greenBorder, icon: (c: string) => <Sparkles size={18} color={c} />, label: 'Completed' },
};

// ─── Completed Card ───────────────────────────────────────────────────────────
function CompletedCard({ item }: { item: ActionItem }) {
  const [open, setOpen] = useState(false);
  const cfg = TAB_CONFIG.Completed;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  return (
    <View style={[styles.card, { borderColor: cfg.border, backgroundColor: cfg.bg }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={[styles.cardStatus, { color: cfg.color }]}>{item.statusText}</Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          {cfg.icon(cfg.color)}
        </View>
      </View>

      <View style={styles.pillsRow}>
        <View style={[styles.pill, { backgroundColor: C.accentLight, borderColor: C.borderMid }]}>
          <Users size={11} color={C.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.pillText, { color: C.accent }]}>{item.participants} people</Text>
        </View>
        {item.hasBadge && (
          <View style={[styles.pill, { backgroundColor: '#fdf8e8', borderColor: '#e8d88a' }]}>
            <Award size={11} color="#8a7010" style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, { color: '#8a7010' }]}>Badge earned</Text>
          </View>
        )}
        {item.photos && item.photos.length > 0 && (
          <TouchableOpacity style={[styles.pill, { backgroundColor: cfg.bg, borderColor: cfg.border }]} onPress={toggle} activeOpacity={0.7}>
            <Camera size={11} color={cfg.color} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, { color: cfg.color }]}>{item.photos.length} photos</Text>
            {open ? <ChevronUp size={11} color={cfg.color} style={{ marginLeft: 3 }} /> : <ChevronDown size={11} color={cfg.color} style={{ marginLeft: 3 }} />}
          </TouchableOpacity>
        )}
      </View>

      {open && item.photos && (
        <View style={styles.galleryWrap}>
          <View style={styles.galleryDivider} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
            {item.photos.map((uri, idx) => (
              <View key={idx} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImg} resizeMode="cover" />
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
    <View style={[styles.card, { borderColor: cfg.border, backgroundColor: cfg.bg }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={[styles.cardStatus, { color: cfg.color }]}>{item.statusText}</Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: C.surface, borderColor: cfg.border }]}>
          {cfg.icon(cfg.color)}
        </View>
      </View>
      <View style={styles.pillsRow}>
        <View style={[styles.pill, { backgroundColor: C.accentLight, borderColor: C.borderMid }]}>
          <Users size={11} color={C.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.pillText, { color: C.accent }]}>{item.participants} people</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GalleryScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('Planned');
  const [isLoading, setIsLoading] = useState(true);
  
  // State for each category
  const [plannedEvents, setPlannedEvents] = useState<ActionItem[]>([]);
  const [activeEvents, setActiveEvents] = useState<ActionItem[]>([]);
  const [completedEvents, setCompletedEvents] = useState<ActionItem[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
      } else if (data) {
        const planned: ActionItem[] = [];
        const active: ActionItem[] = [];
        const completed: ActionItem[] = [];

        data.forEach(dbItem => {
          const mappedItem: ActionItem = {
            id: dbItem.id,
            title: dbItem.title,
            statusText: dbItem.status_text || 'No status',
            participants: dbItem.participants || 1,
            hasBadge: dbItem.has_badge,
            photos: dbItem.photos || [],
          };

          // Categorization Logic
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
      }
      setIsLoading(false);
    };

    fetchEvents();
  }, []);

  const getActiveData = () => {
    switch (activeTab) {
      case 'Planned': return plannedEvents;
      case 'Active': return activeEvents;
      case 'Completed': return completedEvents;
      default: return [];
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<ActionItem>) =>
    activeTab === 'Completed'
      ? <CompletedCard item={item} />
      : <StandardCard  item={item} tab={activeTab} />;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
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
          {TABS.map(tab => {
            const active = activeTab === tab;
            const cfg = TAB_CONFIG[tab];
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, active && { borderBottomColor: cfg.color, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, active && { color: cfg.color, fontWeight: '700' }]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={getActiveData()}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} events right now.</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, color: C.textLight, marginBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.6 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border, marginTop: 16, backgroundColor: C.bg },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '500', color: C.textMuted, letterSpacing: 0.1 },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  emptyText: { textAlign: 'center', marginTop: 48, color: C.textLight, fontSize: 14, fontStyle: 'italic' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14, backgroundColor: C.surface },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.3, marginBottom: 5, lineHeight: 22 },
  cardStatus: { fontSize: 12, fontWeight: '500', letterSpacing: 0.1, lineHeight: 18 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  galleryWrap: { marginTop: 14 },
  galleryDivider: { height: 1, backgroundColor: C.border, marginBottom: 14 },
  galleryScroll: { paddingBottom: 2 },
  photoThumb: { width: 110, height: 110, borderRadius: 12, marginRight: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  photoImg: { width: '100%', height: '100%' },
});