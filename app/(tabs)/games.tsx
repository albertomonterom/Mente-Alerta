import { useWaitMode } from '@/context/wait-mode-context';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const NAVY = '#1B3A6B';
const GREEN = '#2E7D32';

const GAMES = [
  {
    key: 'sopa',
    label: 'Sopa de\nLetras',
    image: require('../../assets/icons/letter-soup.png'),
    bg: '#F2C94C',
    labelColor: '#7A5C00',
  },
  {
    key: 'solitario',
    label: 'Solitario',
    image: require('../../assets/icons/solitaire.png'),
    bg: '#6C5CE7',
    labelColor: '#FFFFFF',
  },
  {
    key: 'sudoku',
    label: 'Sudoku',
    image: require('../../assets/icons/sudoku.png'),
    bg: '#90CAF9',
    labelColor: '#1565C0',
  },
  {
    key: 'domino',
    label: 'Dominó',
    image: require('../../assets/icons/domino.png'),
    bg: '#E8D5B7',
    labelColor: '#5D4037',
  },
];

export default function GamesScreen() {
  const router = useRouter();
  const { defaultDuration, startWaitMode, isActive, largerText, highContrast } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 5 : 0);

  return (
    <ScrollView
      style={[styles.scrollView, highContrast && { backgroundColor: '#FFFFFF' }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <Text style={[styles.title, { fontSize: fs(42), lineHeight: fs(52), color: highContrast ? '#000000' : NAVY }]}>Mente Alerta</Text>
      <Text style={[styles.subtitle, { fontSize: fs(20), color: highContrast ? '#222222' : '#444444' }]}>¡Elige un juego para empezar!</Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Game grid */}
      <View style={styles.grid}>
        {GAMES.map((game) => (
          <Pressable
            key={game.key}
            style={[styles.card, { backgroundColor: game.bg }]}
            accessibilityRole="button"
            accessibilityLabel={game.label.replace('\n', ' ')}
            onPress={() => {
              /* navigate to game */
            }}
          >
            <Image
              source={game.image}
              style={styles.cardImage}
              resizeMode="contain"
            />
            <Text style={[styles.cardLabel, { color: highContrast ? '#000000' : game.labelColor, fontSize: fs(19) }]}>
              {game.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Wait mode button */}
      <Pressable
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Activar Modo Espera"
        onPress={() => {
          if (!isActive) startWaitMode(defaultDuration);
          router.push('/wait');
        }}
      >
        <Text style={[styles.buttonText, { fontSize: fs(21) }]}>ACTIVAR MODO ESPERA</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  title: {
    fontSize: 42,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    textAlign: 'center',
    lineHeight: 52,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Montserrat_400Regular',
    color: '#444444',
    textAlign: 'center',
    lineHeight: 28,
  },
  divider: {
    width: '85%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#CCCCCC',
    marginVertical: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  card: {
    width: '46%',
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  cardImage: {
    width: 95,
    height: 95,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 19,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    minHeight: 70,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
