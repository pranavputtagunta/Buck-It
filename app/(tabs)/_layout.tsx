import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Home, ListTodo, Image as ImageIcon } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Instagram-style clean monochrome colors
        tabBarActiveTintColor: '#000', 
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute', // Allows background blur on iOS
            borderTopWidth: 0,
            elevation: 10,
            shadowOpacity: 0.1,
          },
          default: {
            borderTopWidth: 0,
            elevation: 10,
          },
        }),
      }}>
      
      {/* 1. The Unified Feed */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={28} color={color} />,
        }}
      />
      
      {/* 2. The Bucket List */}
      <Tabs.Screen
        name="bucketlist"
        options={{
          title: 'Bucket List',
          tabBarIcon: ({ color }) => <ListTodo size={28} color={color} />,
        }}
      />
      
      {/* 3. The Action Dashboard */}
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color }) => <ImageIcon size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}