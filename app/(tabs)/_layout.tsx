import React, { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Home, ListTodo, Image as ImageIcon } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_COUNT = 3;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const translateX = useRef(new Animated.Value(state.index * TAB_WIDTH)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * TAB_WIDTH,
      useNativeDriver: true,
      tension: 140,
      friction: 18,
    }).start();
  }, [state.index, translateX]);

  const icons = [Home, ListTodo, ImageIcon];

  return (
    <View style={styles.tabBar}>
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            transform: [{ translateX }],
          },
        ]}
      />

      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const Icon = icons[index];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key]?.options?.tabBarAccessibilityLabel}
            testID={descriptors[route.key]?.options?.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.9}
            style={styles.tabButton}
          >
            <Icon size={28} color={isFocused ? '#fff' : '#888'} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="bucketlist"
        options={{
          title: 'Bucket List',
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 84 : 64,
    backgroundColor: '#000',
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    position: 'relative',
  },
  tabButton: {
    width: TAB_WIDTH,
    height: Platform.OS === 'ios' ? 64 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 0,
    left: TAB_WIDTH * 0.18,
    width: TAB_WIDTH * 0.64,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
});