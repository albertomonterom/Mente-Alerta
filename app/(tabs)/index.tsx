import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Silent gate screen — hidden from the tab bar (href: null in _layout).
 * Checks onboarding status and redirects to the right place.
 */
export default function IndexScreen() {
  useEffect(() => {
    AsyncStorage.getItem('hasCompletedOnboarding').then(val => {
      if (val === 'true') {
        router.replace('/(tabs)/games');
      } else {
        router.replace('/onboarding');
      }
    });
  }, []);

  return null;
}

