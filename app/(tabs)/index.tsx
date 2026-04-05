import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ListRenderItemInfo, SafeAreaView, Modal, Pressable, Animated, Dimensions, LayoutAnimation } from 'react-native';
import { useRouter } from 'expo-router';
import { Send, PlusSquare, Filter, X, Check, MapPin, ChevronDown, ChevronUp, Heart, MessageCircle, Bookmark, PlusCircle } from 'lucide-react-native';
import MapModule from '../../components/MapModule'; 

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BucketItem { id: string; title: string; category: string; }
const MOCK_GOALS: BucketItem[] = [
  { id: '1', title: 'Learn to Surf', category: 'Health & Fitness' },
  { id: '2', title: 'Build an AI Hardware Project', category: 'Career & Skills' },
  { id: '3', title: 'Hike Yosemite Half Dome', category: 'Travel & Adventure' },
];

interface Story { id: string; name: string; image: string; }
const MOCK_STORIES: Story[] = [
  { id: '1', name: 'Alex', image: 'https://images.unsplash.com/photo-1506869640319-ce1a24fd4ce8?q=80&w=200&auto=format&fit=crop' },
  { id: '2', name: 'Sam', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=200&auto=format&fit=crop' },
  { id: '3', name: 'Jordan', image: 'https://images.unsplash.com/photo-1526401485004-46910ecc8e51?q=80&w=200&auto=format&fit=crop' },
];

interface EventItem { id: string; user: string; locationName: string; coords: { latitude: number; longitude: number }; title: string; image: string; deadline: string; bucketItemId: string; }
const MOCK_EVENTS: EventItem[] = [
  { id: '1', user: 'Alex', locationName: 'Torrey Pines Reserve', coords: { latitude: 32.9218, longitude: -117.2532 }, title: 'Morning Hike Group', image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=800&auto=format&fit=crop', deadline: 'Expires in 2 days', bucketItemId: '3' },
  { id: '2', user: 'Sam', locationName: 'Mission Bay Rentals', coords: { latitude: 32.7915, longitude: -117.2212 }, title: 'Beginner Kayaking', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=800&auto=format&fit=crop', deadline: 'Expires in 5 days', bucketItemId: '1' },
];

interface PostItem { id: string; user: string; locationName: string; caption: string; image: string; likes: number; }
const MOCK_POSTS: PostItem[] = [
  { id: '101', user: 'Jordan', locationName: 'La Jolla Cove', caption: 'Finally checked snorkeling off the list! The sea lions were incredible. 🦭🌊', image: 'https://images.unsplash.com/photo-1544552866-d3ed42536fcb?q=80&w=800&auto=format&fit=crop', likes: 124 },
  { id: '102', user: 'Taylor', locationName: 'Joshua Tree', caption: 'Weekend bouldering trip was a success. Hands are destroyed but worth it.', image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=800&auto=format&fit=crop', likes: 89 },
];

export default function HomeScreen() {
  const router = useRouter();
  const [feedType, setFeedType] = useState<'Events' | 'Posts'>('Events');
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([]);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const toggleMap = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMapId(prev => prev === id ? null : id);
  };

  const openFilter = () => {
    setIsFilterVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 12 }).start();
  };

  const closeFilter = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => setIsFilterVisible(false));
  };

  const toggleFilter = (id: string) => {
    setActiveFilterIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const displayedEvents = activeFilterIds.length > 0 ? MOCK_EVENTS.filter(e => activeFilterIds.includes(e.bucketItemId)) : MOCK_EVENTS;

  const renderStory = ({ item }: ListRenderItemInfo<Story>) => (
    <View style={styles.storyContainer}>
      <View style={styles.storyRing}>
        <Image source={{ uri: item.image }} style={styles.storyImage} />
      </View>
      <Text style={styles.storyText}>{item.name}</Text>
    </View>
  );

  const renderEvent = ({ item }: ListRenderItemInfo<EventItem>) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardUser}>{item.user}</Text>
        <TouchableOpacity style={styles.locationDropdown} onPress={() => toggleMap(item.id)} activeOpacity={0.7}>
          <MapPin color="#318bfb" size={12} style={{ marginRight: 4 }} />
          <Text style={styles.cardLocation}>{item.locationName}</Text>
          {expandedMapId === item.id ? <ChevronUp color="#888" size={14} style={{ marginLeft: 2 }} /> : <ChevronDown color="#888" size={14} style={{ marginLeft: 2 }} />}
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
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
          <Text style={styles.actionButtonText}>Lock it in</Text>
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
          <Heart color="#000" size={24} style={styles.postIcon} />
          <MessageCircle color="#000" size={24} style={styles.postIcon} />
          <Send color="#000" size={24} style={styles.postIcon} />
        </View>
        <Bookmark color="#000" size={24} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.likesText}>{item.likes} likes</Text>
        <Text style={styles.captionText}><Text style={styles.captionUser}>{item.user}</Text> {item.caption}</Text>
        <TouchableOpacity style={styles.addToBucketButton} activeOpacity={0.8}>
          <PlusCircle color="#000" size={18} style={{ marginRight: 6 }} />
          <Text style={styles.addToBucketText}>Add to your Bucket List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logoText}>Bucket</Text>
          <View style={styles.headerIcons}>
            {feedType === 'Events' && (
              <TouchableOpacity activeOpacity={0.7} style={{ marginRight: 20 }} onPress={openFilter}>
                <Filter color={activeFilterIds.length > 0 ? "#318bfb" : "#000"} size={26} />
                {activeFilterIds.length > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterIds.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity activeOpacity={0.7} style={{ marginRight: 20 }}>
              <PlusSquare color="#000" size={26} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/messages')}>
              <View>
                <Send color="#000" size={26} />
                <View style={styles.unreadBadge} /> 
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={(feedType === 'Events' ? displayedEvents : MOCK_POSTS) as any[]}
          keyExtractor={(item: any) => item.id}
          renderItem={feedType === 'Events' ? renderEvent as any : renderPost as any}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View>
              <View style={styles.storiesSection}>
                <FlatList data={MOCK_STORIES} horizontal showsHorizontalScrollIndicator={false} keyExtractor={item => item.id} renderItem={renderStory} contentContainerStyle={{ paddingHorizontal: 16 }} />
              </View>
              <View style={styles.switcherContainer}>
                <TouchableOpacity style={[styles.switcherTab, feedType === 'Events' && styles.switcherTabActive]} onPress={() => setFeedType('Events')}>
                  <Text style={[styles.switcherText, feedType === 'Events' && styles.switcherTextActive]}>Events</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.switcherTab, feedType === 'Posts' && styles.switcherTabActive]} onPress={() => setFeedType('Posts')}>
                  <Text style={[styles.switcherText, feedType === 'Posts' && styles.switcherTextActive]}>Scrapbook</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <Modal visible={isFilterVisible} transparent={true} animationType="fade" onRequestClose={closeFilter}>
          <Pressable style={styles.modalOverlay} onPress={closeFilter}>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filter by Goals</Text>
                  <TouchableOpacity onPress={closeFilter} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <X color="#000" size={24} />
                  </TouchableOpacity>
                </View>
                <FlatList 
                  data={MOCK_GOALS}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <TouchableOpacity style={styles.filterOption} onPress={() => setActiveFilterIds([])}>
                      <Text style={[styles.filterOptionText, activeFilterIds.length === 0 && styles.filterOptionTextActive]}>Show All Events</Text>
                      {activeFilterIds.length === 0 && <Check color="#318bfb" size={20} />}
                    </TouchableOpacity>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.filterOption} onPress={() => toggleFilter(item.id)}>
                      <View>
                        <Text style={[styles.filterOptionText, activeFilterIds.includes(item.id) && styles.filterOptionTextActive]}>{item.title}</Text>
                        <Text style={styles.filterOptionSubtext}>{item.category}</Text>
                      </View>
                      {activeFilterIds.includes(item.id) ? <Check color="#318bfb" size={20} /> : <View style={styles.emptyCheckCircle} />}
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
                <TouchableOpacity style={styles.applyFilterButton} onPress={closeFilter}>
                  <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  logoText: { fontSize: 26, fontWeight: '900', letterSpacing: -1, color: '#000' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ff4d4d', width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  filterBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#318bfb', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  switcherContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  switcherTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  switcherTabActive: { borderBottomWidth: 2, borderBottomColor: '#000' },
  switcherText: { fontSize: 15, fontWeight: '600', color: '#888' },
  switcherTextActive: { color: '#000', fontWeight: '800' },
  storiesSection: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  storyContainer: { alignItems: 'center', marginRight: 16 },
  storyRing: { padding: 3, borderRadius: 40, borderWidth: 2, borderColor: '#000' },
  storyImage: { width: 64, height: 64, borderRadius: 32 },
  storyText: { marginTop: 4, fontSize: 12, fontWeight: '500', color: '#000' },
  cardContainer: { marginBottom: 24, borderBottomWidth: 1, borderColor: '#f0f0f0', paddingBottom: 16 },
  cardHeader: { padding: 12 },
  cardUser: { fontWeight: 'bold', fontSize: 14, color: '#000' },
  locationDropdown: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  cardLocation: { fontSize: 12, color: '#666', fontWeight: '500' },
  cardImage: { width: '100%', height: 400, backgroundColor: '#f8f8f8' },
  cardFooter: { paddingHorizontal: 12, paddingTop: 8 },
  eventTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#000', marginTop: 4 },
  deadlineBadge: { backgroundColor: '#ffebe6', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  deadlineText: { color: '#ff4d4d', fontSize: 12, fontWeight: '700' },
  actionButton: { backgroundColor: '#000', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12 },
  postIconsLeft: { flexDirection: 'row', alignItems: 'center' },
  postIcon: { marginRight: 16 },
  likesText: { fontWeight: 'bold', color: '#000', marginBottom: 4, marginTop: 4 },
  captionText: { color: '#000', fontSize: 14, lineHeight: 20 },
  captionUser: { fontWeight: 'bold' },
  addToBucketButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginTop: 16 },
  addToBucketText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '80%' },
  dragHandleContainer: { alignItems: 'center', marginBottom: 12 },
  dragHandle: { width: 40, height: 5, backgroundColor: '#ccc', borderRadius: 3 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f8f8f8' },
  filterOptionText: { fontSize: 16, color: '#000' },
  filterOptionTextActive: { fontWeight: 'bold', color: '#318bfb' },
  filterOptionSubtext: { fontSize: 12, color: '#888', marginTop: 4 },
  emptyCheckCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  applyFilterButton: { backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  applyFilterButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});