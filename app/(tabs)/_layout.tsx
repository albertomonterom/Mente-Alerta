import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
          headerShown: true,
          tabBarButton: HapticTab,
          tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
          tabBarStyle: { height: 70, paddingBottom: 10, paddingTop: 6 },
          headerTitleStyle: { fontSize: 22, fontWeight: 'bold' },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="games" options={{ title: 'Juegos', tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" size={size} color={color} /> }} />
        <Tabs.Screen name="wait" options={{ title: 'Espera', tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: 'Configuración', tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
      </Tabs>
    </>
  );
}