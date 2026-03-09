import { useWaitMode } from '@/context/wait-mode-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const NAVY = '#1B3A6B';
const GREEN = '#2E7D32';

const GAMES = [
  {
    key: 'sopa',
    label: 'Sopa de\nLetras',
    image: require('../../assets/icons/letter-soup.png'),
    bg: '#F2C94C',
    labelColor: '#7A5C00',
    route: '/word-search' as const,
  },
  {
    key: 'solitario',
    label: 'Solitario',
    image: require('../../assets/icons/solitaire.png'),
    bg: '#6C5CE7',
    labelColor: '#FFFFFF',
    route: '/solitario' as const,
  },
  {
    key: 'sudoku',
    label: 'Sudoku',
    image: require('../../assets/icons/sudoku.png'),
    bg: '#90CAF9',
    labelColor: '#1565C0',
    route: '/sudoku' as const,
  },
  {
    key: 'domino',
    label: 'Dominó',
    image: require('../../assets/icons/domino.png'),
    bg: '#E8D5B7',
    labelColor: '#5D4037',
    route: '/domino' as const,
  },
];

const DURATIONS = [
  { label: '5 minutos', value: 5 },
  { label: '15 minutos', value: 15 },
  { label: '20 minutos', value: 20 },
];

export default function GamesScreen() {
  const router = useRouter();
  const { startWaitMode, largerText, highContrast, isActive } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 5 : 0);

  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  // Look up the route for whatever game is currently selected
  const getRoute = (gameKey: string) =>
    GAMES.find(g => g.key === gameKey)?.route ?? null;

  const navigateTo = (gameKey: string) => {
    const route = getRoute(gameKey);
    if (route) {
      router.push(route);
    } else {
      Alert.alert('Próximamente', 'Este juego estará disponible pronto. ¡Vuelve pronto!');
    }
  };

  const handleGamePress = (gameKey: string) => {
    setSelectedGame(gameKey);
    if (isActive) {
      // Wait mode already active — go straight to the game
      navigateTo(gameKey);
      return;
    }
    setShowWaitModal(true);
  };

  const handleConfirmWait = () => {
    setShowWaitModal(false);
    setShowTimeModal(true);
  };

  const handleDeclineWait = () => {
    setShowWaitModal(false);
    if (selectedGame) navigateTo(selectedGame);
  };

  const handleSelectDuration = (minutes: number) => {
    setShowTimeModal(false);
    startWaitMode(minutes);
    if (selectedGame) navigateTo(selectedGame);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.scrollView, highContrast && { backgroundColor: '#FFFFFF' }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: fs(50), lineHeight: fs(60), color: highContrast ? '#000000' : NAVY }]}>
          Mente Alerta
        </Text>
        <Text style={[styles.subtitle, { fontSize: fs(24), color: highContrast ? '#222222' : '#444444' }]}>
          ¡Elige un juego para empezar!
        </Text>

        <View style={styles.divider} />

        <View style={styles.grid}>
          {GAMES.map((game) => (
            <Pressable
              key={game.key}
              style={[styles.card, { backgroundColor: game.bg }]}
              accessibilityRole="button"
              accessibilityLabel={game.label.replace('\n', ' ')}
              onPress={() => handleGamePress(game.key)}
            >
              <Image source={game.image} style={styles.cardImage} resizeMode="contain" />
              <Text style={[styles.cardLabel, { color: highContrast ? '#000000' : game.labelColor, fontSize: fs(22) }]}>
                {game.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.divider} />
      </ScrollView>

      {/* Modal 1: ¿Activar modo espera? */}
      <Modal visible={showWaitModal} transparent animationType="fade" onRequestClose={() => setShowWaitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={[styles.modalTitle, { fontSize: fs(34) }]}>¿Modo Espera?</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalBtnYes]} onPress={handleConfirmWait}>
                <Text style={[styles.modalBtnText, { fontSize: fs(28) }]}>Sí</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnNo]} onPress={handleDeclineWait}>
                <Text style={[styles.modalBtnText, { fontSize: fs(28) }]}>No</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2: ¿Cuánto tiempo? */}
      <Modal visible={showTimeModal} transparent animationType="fade" onRequestClose={() => setShowTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={[styles.modalTitle, { fontSize: fs(34) }]}>¿Cuánto tiempo?</Text>
            <View style={styles.timeButtons}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d.value}
                  style={styles.timeBtn}
                  onPress={() => handleSelectDuration(d.value)}
                  accessibilityRole="button"
                  accessibilityLabel={d.label}
                >
                  <Text style={[styles.timeBtnText, { fontSize: fs(30) }]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 50,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    textAlign: 'center',
    lineHeight: 60,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    fontFamily: 'Montserrat_400Regular',
    color: '#444444',
    textAlign: 'center',
    lineHeight: 32,
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
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    lineHeight: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 36,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    textAlign: 'center',
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalBtnYes: {
    backgroundColor: GREEN,
  },
  modalBtnNo: {
    backgroundColor: '#9E9E9E',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
  },
  timeButtons: {
    width: '100%',
    gap: 16,
  },
  timeBtn: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 26,
    alignItems: 'center',
    width: '100%',
  },
  timeBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
  },
});