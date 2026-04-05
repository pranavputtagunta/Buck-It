// src/styles/homeStyles.ts
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  logoText: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  headerIcons: { flexDirection: 'row' },
  
  // Stories Section
  storiesSection: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  storyContainer: { alignItems: 'center', marginRight: 16 },
  storyRing: { padding: 3, borderRadius: 40, borderWidth: 2, borderColor: '#000' },
  storyImage: { width: 64, height: 64, borderRadius: 32 },
  storyText: { marginTop: 4, fontSize: 12, fontWeight: '500' },
  
  // Post Section
  postContainer: { marginBottom: 24 },
  postHeader: { padding: 12 },
  postUser: { fontWeight: 'bold', fontSize: 14 },
  postLocation: { fontSize: 12, color: '#666', marginTop: 2 },
  postImage: { width: '100%', height: 400 },
  postFooter: { padding: 12 },
  postTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  
  // Badges & Buttons
  deadlineBadge: { backgroundColor: '#ffebe6', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 12 },
  deadlineText: { color: '#ff4d4d', fontSize: 12, fontWeight: '600' },
  actionButton: { backgroundColor: '#000', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});