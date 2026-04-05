import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, Stack } from 'expo-router'; 
import { ChevronLeft, Edit } from 'lucide-react-native';

const MOCK_CHATS = [
  { id: '1', title: 'Sunset Kayaking 🌅', last: "I'll bring the speaker!", user: 'Alex' },
  { id: '2', title: 'Torrey Pines Hike', last: 'Trailhead at 8am?', user: 'Sam' },
];

export default function MessagesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}><ChevronLeft color="#000" size={32} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Messages</Text>
        <TouchableOpacity><Edit color="#000" size={24} /></TouchableOpacity>
      </View>
      <FlatList
        data={MOCK_CHATS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ flexDirection: 'row', padding: 16, alignItems: 'center' }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee', marginRight: 15 }} />
            <View>
              <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
              <Text style={{ color: '#888' }}>{item.user}: {item.last}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
});