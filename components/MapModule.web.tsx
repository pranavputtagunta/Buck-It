// components/MapModule.web.tsx
// This file ONLY runs on the Web browser
import React from 'react';
import { View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';

export default function MapModule({ coords, locationName }: { coords: any, locationName: string }) {
  return (
    <View style={{ height: 150, width: '100%', backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <MapPin color="#888" size={32} style={{ marginBottom: 8 }} />
      <Text style={{ color: '#888', fontWeight: 'bold' }}>Live Maps require iOS/Android</Text>
      <Text style={{ color: '#aaa', fontSize: 12 }}>Switch to Expo Go or a Simulator.</Text>
    </View>
  );
}