import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useWaitMode } from '@/context/wait-mode-context';

const NAVY = '#1B3A6B';

export default function HomeScreen() {
  const router = useRouter();
  const { largerText, highContrast } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 5 : 0);

  return (
    <ThemedView style={styles.container}>
      {/* Title & subtitle */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { fontSize: fs(49), lineHeight: fs(54), color: highContrast ? '#000000' : NAVY }]}>Mente Alerta</ThemedText>
        <ThemedText style={[styles.subtitle, { fontSize: fs(24), lineHeight: fs(32), color: highContrast ? '#222222' : '#555555' }]}>
          Juegos sencillos para ejercitar{'\n'}tu mente mientras esperas.
        </ThemedText>
      </View>

      {/* Primary action */}
      <View style={styles.bottom}>
        <Pressable
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Comenzar"
          onPress={() => router.push('/games')}
        >
          <ThemedText style={[styles.buttonText, { fontSize: fs(25), lineHeight: fs(32), textAlign: 'center' }]}>COMENZAR</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  title: {
    fontSize: 49,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    textAlign: 'center',
    lineHeight: 54,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 24,
    fontFamily: 'Montserrat_400Regular',
    color: '#555555',
    textAlign: 'center',
    lineHeight: 32,
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    minHeight: 70,
    borderRadius: 16,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 1.5,
  },
});
