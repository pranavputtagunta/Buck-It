// components/MapModule.tsx
// This file ONLY runs on iOS and Android
import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { View, StyleSheet } from 'react-native';

export default function MapModule({ coords, locationName }: { coords: any, locationName: string }) {
  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        initialRegion={{ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        scrollEnabled={false}
        zoomEnabled={false}
      >
        <Marker coordinate={coords} title={locationName} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 150, width: '100%', backgroundColor: '#eee' },
  map: { flex: 1 }
});