import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Send,
  PlusSquare,
  Filter,
  X,
  Check,
  MapPin,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Bookmark,
  PlusCircle,
  LogOut,
} from 'lucide-react-native';
import MapModule from './MapModule';
import { supabase } from '../app/lib/supabase';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          '#f7f5f2',
  surface:     '#ffffff',
  border:      '#e8e3dc',
  borderMid:   '#ddd6cc',
  textPrimary: '#1a1814',
  textMuted:   '#a09890',
  textLight:   '#c0b9b0',
  accent:      '#7a6e62',
  accentDark:  '#3a342e',
  accentLight: '#ede9e3',
  red:         '#b84030',
  redBg:       '#fff5f3',
  redBorder:   '#f2d0c8',
  blue:        '#318bfb',
};

// ─── Types & Mock Data ────────────────────────────────────────────────────────

interface BucketItem { id: string; title: string; category: string; }
interface Story      { id: string; name: string; image: string; }
interface EventItem  { id: string; user: string; locationName: string; coords: { latitude: number; longitude: number }; title: string; image: string; deadline: string; bucketItemId: string; }
interface PostItem   { id: string; user: string; locationName: string; caption: string; image: string; likes: number; }

const MOCK_GOALS: BucketItem[] = [
  { id: '1', title: 'Learn to Surf',               category: 'Health & Fitness'   },
  { id: '2', title: 'Build an AI Hardware Project', category: 'Career & Skills'    },
  { id: '3', title: 'Hike Yosemite Half Dome',      category: 'Travel & Adventure' },
];

const MOCK_STORIES: Story[] = [
  { id: '1', name: 'Alex',   image: 'https://images.unsplash.com/photo-1506869640319-ce1a24fd4ce8?q=80&w=200&auto=format&fit=crop' },
  { id: '2', name: 'Sam',    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=200&auto=format&fit=crop' },
  { id: '3', name: 'Jordan', image: 'https://images.unsplash.com/photo-1526401485004-46910ecc8e51?q=80&w=200&auto=format&fit=crop' },
];

const MOCK_EVENTS: EventItem[] = [
  {
    id: '1', user: 'Alex', locationName: 'Torrey Pines Reserve',
    coords: { latitude: 32.9218, longitude: -117.2532 },
    title: 'Morning Hike Group',
    image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=800&auto=format&fit=crop',
    deadline: 'Expires in 2 days', bucketItemId: '3',
  },
  {
    id: '2', user: 'Sam', locationName: 'Mission Bay Rentals',
    coords: { latitude: 32.7915, longitude: -117.2212 },
    title: 'Beginner Kayaking',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=800&auto=format&fit=crop',
    deadline: 'Expires in 5 days', bucketItemId: '1',
  },
];

const MOCK_POSTS: PostItem[] = [
  {
    id: '101', user: 'Jordan', locationName: 'La Jolla Cove',
    caption: 'Finally checked snorkeling off the list! The sea lions were incredible. 🦭🌊',
    image: 'https://images.unsplash.com/photo-1544552866-d3ed42536fcb?q=80&w=800&auto=format&fit=crop',
    likes: 124,
  },
  {
    id: '102', user: 'Taylor', locationName: 'Joshua Tree',
    caption: 'Weekend bouldering trip was a success. Hands are destroyed but worth it.',
    image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=800&auto=format&fit=crop',
    likes: 89,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomeFeed() {
  const router = useRouter();
  const [feedType, setFeedType]           = useState<'Events' | 'Posts'>('Events');
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([]);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) { Alert.alert('Logout failed', error.message); }
    } catch (err) {
      Alert.alert('Logout failed', 'Something went wrong.');
    }
  };

  const toggleMap = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMapId(prev => prev === id ? null : id);
  };

  const openFilter = () => {
    setIsFilterVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 12 }).start();
  };

  const closeFilter = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true })
      .start(() => setIsFilterVisible(false));
  };

  const toggleFilter = (id: string) => {
    setActiveFilterIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const displayedEvents = activeFilterIds.length > 0
    ? MOCK_EVENTS.filter(e => activeFilterIds.includes(e.bucketItemId))
    : MOCK_EVENTS;

  // ── Stories ──

  const renderStory = ({ item }: ListRenderItemInfo<Story>) => (
    <View style={styles.storyContainer}>
      <View style={styles.storyRing}>
        <Image source={{ uri: item.image }} style={styles.storyImage} />
      </View>
      <Text style={styles.storyText}>{item.name}</Text>
    </View>
  );

  // ── Event Card ──

  const renderEvent = ({ item }: ListRenderItemInfo<EventItem>) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardUser}>{item.user}</Text>
        <TouchableOpacity style={styles.locationRow} onPress={() => toggleMap(item.id)} activeOpacity={0.7}>
          <MapPin color={C.blue} size={12} style={{ marginRight: 4 }} />
          <Text style={styles.cardLocation}>{item.locationName}</Text>
          {expandedMapId === item.id
            ? <ChevronUp  color={C.textMuted} size={14} style={{ marginLeft: 2 }} />
            : <ChevronDown color={C.textMuted} size={14} style={{ marginLeft: 2 }} />}
        </TouchableOpacity>
      </View>

      {expandedMapId === item.id && (
        <MapModule coords={item.coords} locationName={item.locationName} />
      )}

      <Image source={{ uri: item.image }} style={styles.cardImage} />

      <View style={styles.cardFooter}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.deadlineBadge}>
          <Text style={styles.deadlineText}>{item.deadline}</Text>
        </View>
        <TouchableOpacity style={styles.lockBtn} activeOpacity={0.75}>
          <Text style={styles.lockBtnText}>Lock it in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Post Card ──

  const renderPost = ({ item }: ListRenderItemInfo<PostItem>) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardUser}>{item.user}</Text>
        <Text style={styles.cardLocation}>{item.locationName}</Text>
      </View>

      <Image source={{ uri: item.image }} style={styles.cardImage} />

      <View style={styles.postActions}>
        <View style={styles.postIconsLeft}>
          <Heart        color={C.textPrimary} size={24} style={{ marginRight: 16 }} />
          <MessageCircle color={C.textPrimary} size={24} style={{ marginRight: 16 }} />
          <Send         color={C.textPrimary} size={24} />
        </View>
        <Bookmark color={C.textPrimary} size={24} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.likesText}>{item.likes} likes</Text>
        <Text style={styles.captionText}>
          <Text style={styles.captionUser}>{item.user} </Text>
          {item.caption}
        </Text>
        <TouchableOpacity style={styles.addBucketBtn} activeOpacity={0.75}>
          <PlusCircle color={C.accent} size={18} style={{ marginRight: 8 }} />
          <Text style={styles.addBucketText}>Add to your Bucket List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Render ──

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Bucket</Text>
          <View style={styles.headerIcons}>
            {feedType === 'Events' && (
              <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={openFilter}>
                <Filter color={activeFilterIds.length > 0 ? C.blue : C.textPrimary} size={24} />
                {activeFilterIds.length > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterIds.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn}>
              <PlusSquare color={C.textPrimary} size={24} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={() => router.push('/messages')}>
              <View>
                <Send color={C.textPrimary} size={24} />
                <View style={styles.unreadDot} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7} style={styles.iconBtn} onPress={handleLogout}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <LogOut color={C.textMuted} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Feed */}
        <FlatList
          data={(feedType === 'Events' ? displayedEvents : MOCK_POSTS) as any[]}
          keyExtractor={(item: any) => item.id}
          renderItem={feedType === 'Events' ? (renderEvent as any) : (renderPost as any)}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View>
              {/* Stories */}
              <View style={styles.storiesRow}>
                <FlatList
                  data={MOCK_STORIES}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={item => item.id}
                  renderItem={renderStory}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                />
              </View>

              {/* Tab switcher */}
              <View style={styles.switcher}>
                {(['Events', 'Scrapbook'] as const).map(tab => {
                  const key = tab === 'Scrapbook' ? 'Posts' : tab;
                  const active = feedType === key;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.switcherTab, active && styles.switcherTabActive]}
                      onPress={() => setFeedType(key as any)}
                    >
                      <Text style={[styles.switcherText, active && styles.switcherTextActive]}>
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />

        {/* Filter Modal */}
        <Modal visible={isFilterVisible} transparent animationType="fade" onRequestClose={closeFilter}>
          <Pressable style={styles.overlay} onPress={closeFilter}>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
              <Pressable onPress={e => e.stopPropagation()}>
                <View style={styles.dragHandleWrap}>
                  <View style={styles.dragHandle} />
                </View>

                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Filter by Goals</Text>
                  <TouchableOpacity onPress={closeFilter} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X color={C.textMuted} size={22} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={MOCK_GOALS}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <TouchableOpacity style={styles.filterRow} onPress={() => setActiveFilterIds([])}>
                      <Text style={[styles.filterRowText, activeFilterIds.length === 0 && styles.filterRowTextActive]}>
                        Show All Events
                      </Text>
                      {activeFilterIds.length === 0
                        ? <Check color={C.blue} size={18} />
                        : <View style={styles.emptyCircle} />}
                    </TouchableOpacity>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.filterRow} onPress={() => toggleFilter(item.id)}>
                      <View>
                        <Text style={[styles.filterRowText, activeFilterIds.includes(item.id) && styles.filterRowTextActive]}>
                          {item.title}
                        </Text>
                        <Text style={styles.filterRowSub}>{item.category}</Text>
                      </View>
                      {activeFilterIds.includes(item.id)
                        ? <Check color={C.blue} size={18} />
                        : <View style={styles.emptyCircle} />}
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingBottom: 16 }}
                />

                <TouchableOpacity style={styles.applyBtn} onPress={closeFilter} activeOpacity={0.75}>
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bg,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: C.textPrimary,
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn:     { marginLeft: 18, justifyContent: 'center', alignItems: 'center' },

  unreadDot: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: C.red, width: 10, height: 10,
    borderRadius: 5, borderWidth: 2, borderColor: C.bg,
  },
  filterBadge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: C.blue, width: 15, height: 15,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.bg,
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Stories
  storiesRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  storyContainer: { alignItems: 'center', marginRight: 16 },
  storyRing: {
    padding: 2, borderRadius: 40,
    borderWidth: 2, borderColor: C.accentDark,
  },
  storyImage: { width: 62, height: 62, borderRadius: 31 },
  storyText:  { marginTop: 5, fontSize: 11, fontWeight: '600', color: C.textPrimary, letterSpacing: 0.2 },

  // Tab switcher
  switcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  switcherTab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  switcherTabActive: { borderBottomWidth: 2, borderBottomColor: C.accentDark },
  switcherText:      { fontSize: 14, fontWeight: '500', color: C.textMuted },
  switcherTextActive:{ fontSize: 14, fontWeight: '700', color: C.textPrimary },

  // Cards
  cardContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingBottom: 16,
    backgroundColor: C.surface,
  },
  cardHeader: { paddingHorizontal: 14, paddingVertical: 11 },
  cardUser:   { fontSize: 14, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.2 },
  locationRow:{ flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  cardLocation:{ fontSize: 12, color: C.textMuted, fontWeight: '500' },
  cardImage:  { width: '100%', height: 380, backgroundColor: C.accentLight },
  cardFooter: { paddingHorizontal: 14, paddingTop: 10 },

  // Event footer
  eventTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.3, marginBottom: 8, marginTop: 2 },
  deadlineBadge: {
    backgroundColor: C.redBg, alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 7, borderWidth: 1, borderColor: C.redBorder,
    marginBottom: 12,
  },
  deadlineText: { color: C.red, fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  lockBtn: {
    backgroundColor: C.accentLight,
    borderWidth: 1, borderColor: C.borderMid,
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  lockBtnText: { color: C.accentDark, fontWeight: '700', fontSize: 14, letterSpacing: 0.1 },

  // Post footer
  postActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12,
  },
  postIconsLeft: { flexDirection: 'row', alignItems: 'center' },
  likesText:  { fontWeight: '700', color: C.textPrimary, marginBottom: 4, marginTop: 6 },
  captionText:{ color: C.textPrimary, fontSize: 14, lineHeight: 20 },
  captionUser:{ fontWeight: '700' },
  addBucketBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accentLight, borderWidth: 1, borderColor: C.border,
    paddingVertical: 12, borderRadius: 12, marginTop: 14,
  },
  addBucketText: { color: C.accent, fontWeight: '600', fontSize: 14, letterSpacing: 0.1 },

  // Filter modal
  overlay: { flex: 1, backgroundColor: 'rgba(26,24,20,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '80%',
  },
  dragHandleWrap: { alignItems: 'center', marginBottom: 14 },
  dragHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 99 },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: C.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.3 },

  filterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f5f2ef',
  },
  filterRowText:      { fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  filterRowTextActive:{ color: C.blue, fontWeight: '700' },
  filterRowSub:       { fontSize: 11, color: C.textMuted, marginTop: 3, fontWeight: '500', letterSpacing: 0.2 },
  emptyCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.borderMid },

  applyBtn: {
    backgroundColor: C.accentDark, paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 16,
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.1 },
});