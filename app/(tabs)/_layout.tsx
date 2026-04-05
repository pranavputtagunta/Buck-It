import { Tabs } from "expo-router";
import { Home, Image as ImageIcon, ListTodo, User } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

const ICONS_BY_ROUTE: Record<
  string,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  index: Home,
  bucketlist: ListTodo,
  gallery: ImageIcon,
  profile: User,
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const visibleRoutes = state.routes.filter(
    (route: any) => descriptors[route.key]?.options?.href !== null,
  );
  const visibleCount = Math.max(visibleRoutes.length, 1);
  const tabWidth = SCREEN_WIDTH / visibleCount;
  const focusedRouteKey = state.routes[state.index]?.key;
  const focusedVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((route: any) => route.key === focusedRouteKey),
  );
  const translateX = useRef(
    new Animated.Value(focusedVisibleIndex * tabWidth),
  ).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: focusedVisibleIndex * tabWidth,
      useNativeDriver: true,
      tension: 140,
      friction: 18,
    }).start();
  }, [focusedVisibleIndex, tabWidth, translateX]);

  return (
    <View style={styles.tabBar}>
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            transform: [{ translateX }],
            left: tabWidth * 0.18,
            width: tabWidth * 0.64,
          },
        ]}
      />

      {visibleRoutes.map((route: any, index: number) => {
        const isFocused = focusedRouteKey === route.key;
        const Icon = ICONS_BY_ROUTE[route.name] ?? Home;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={
              descriptors[route.key]?.options?.tabBarAccessibilityLabel
            }
            testID={descriptors[route.key]?.options?.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.9}
            style={[styles.tabButton, { width: tabWidth }]}
          >
            <Icon size={28} color={isFocused ? "#fff" : "#888"} />
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
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="bucketlist"
        options={{
          title: "Bucket List",
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: Platform.OS === "ios" ? 84 : 64,
    backgroundColor: "#000",
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
    position: "relative",
  },
  tabButton: {
    height: Platform.OS === "ios" ? 64 : 64,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  activeIndicator: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 20 : 0,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
});
