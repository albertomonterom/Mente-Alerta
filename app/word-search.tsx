import { useWaitMode } from '@/context/wait-mode-context';
import { generateWordSearch } from '@/utils/word-search-generator';
import { Ionicons } from '@expo/vector-icons';
import { type EventSubscription } from 'expo-modules-core';
import { Stack, useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY        = '#1B3A6B';
const GOLD        = '#F5A623';
const FOUND_BG    = '#A8C8F0';
const FOUND_TEXT  = '#1A3A7A';
const SEL_BG      = '#D4EAFF';
const BORDER_CLR  = '#CCCCCC';

// ─── Word pool ────────────────────────────────────────────────────────────────

const WORD_POOL = [
  'AGUA', 'VERDE', 'LETRA', 'FLOR', 'SOL', 'AZUL',
  'LUNA', 'CASA', 'MESA', 'LIBRO', 'GATO', 'PERRO',
  'NUBE', 'PATO', 'ARBOL', 'PLAYA', 'CAMPO', 'FUEGO',
  'VIENTO', 'TIERRA', 'ROSA', 'LIMON', 'PERA', 'MANGO',
];

const GRID_SIZE = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns an ordered array of "r-c" keys along the straight line from
 * (startRow, startCol) → (endRow, endCol), or null if the two points
 * are not aligned horizontally, vertically, or diagonally.
 */
function getCellsBetween(
  startRow: number, startCol: number,
  endRow:   number, endCol:   number,
): string[] | null {
  const dr = endRow - startRow;
  const dc = endCol - startCol;

  if (dr === 0 && dc === 0) return null; // same cell — no path

  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  const isHorizontal = dr === 0;
  const isVertical   = dc === 0;
  const isDiagonal   = absDr === absDc;

  if (!isHorizontal && !isVertical && !isDiagonal) return null;

  const steps = Math.max(absDr, absDc);
  const stepR = dr === 0 ? 0 : dr / absDr; // -1 | 0 | +1
  const stepC = dc === 0 ? 0 : dc / absDc;

  const cells: string[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push(`${startRow + i * stepR}-${startCol + i * stepC}`);
  }
  return cells;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WordSearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    suspendWaitModeVoiceDetection,
    resumeWaitModeVoiceDetection,
  } = useWaitMode();

  const SIDE_PAD  = 8;
  const cellSize  = Math.floor((width - SIDE_PAD * 2) / 8);
  const cellFont  = Math.floor(cellSize * 0.58);

  const newPuzzle = useCallback(() => generateWordSearch(GRID_SIZE, WORD_POOL), []);

  const [puzzle,         setPuzzle]         = useState(() => newPuzzle());
  const [startCell,      setStartCell]      = useState<{ r: number; c: number } | null>(null);
  const [selectedCells,  setSelectedCells]  = useState<Set<string>>(new Set());
  const [foundWords,     setFoundWords]     = useState<Set<string>>(new Set());
  const [justFoundCells, setJustFoundCells] = useState<Set<string>>(new Set());
  const [isInvalidFlash, setIsInvalidFlash] = useState(false);
  const [isPaused,       setIsPaused]       = useState(false);
  const [hints,          setHints]          = useState(3);
  const [hintCells,      setHintCells]      = useState<Set<string>>(new Set());
  const [showNewModal,   setShowNewModal]   = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const invalidFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foundFlashRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winCardAnim     = useRef(new Animated.Value(0)).current;
  const resultSubscriptionRef = useRef<EventSubscription | null>(null);
  const endSubscriptionRef = useRef<EventSubscription | null>(null);
  const errorSubscriptionRef = useRef<EventSubscription | null>(null);
  const suspendedWaitModeRef = useRef(false);

  const resumeWaitModeIfNeeded = useCallback(() => {
    if (!suspendedWaitModeRef.current) return;
    suspendedWaitModeRef.current = false;
    resumeWaitModeVoiceDetection();
  }, [resumeWaitModeVoiceDetection]);

  // True once every placed word has been found
  const isGameComplete =
    foundWords.size > 0 && foundWords.size === puzzle.placedWords.length;

  // One Animated.Value per word — used for the bounce on correct find
  const wordScaleAnims = useMemo(
    () => new Map(puzzle.placedWords.map(pw => [pw.word, new Animated.Value(1)])),
    [puzzle],
  );

  // Animate the win card in whenever isGameComplete flips to true
  useEffect(() => {
    if (isGameComplete) {
      winCardAnim.setValue(0);
      Animated.spring(winCardAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [isGameComplete, winCardAnim]);

  const handleNewGame = useCallback(() => {
    if (invalidFlashRef.current) clearTimeout(invalidFlashRef.current);
    if (foundFlashRef.current)   clearTimeout(foundFlashRef.current);
    winCardAnim.setValue(0);
    setShowNewModal(false);
    setPuzzle(newPuzzle());
    setStartCell(null);
    setSelectedCells(new Set());
    setFoundWords(new Set());
    setJustFoundCells(new Set());
    setIsInvalidFlash(false);
    setIsPaused(false);
    setHints(3);
    setHintCells(new Set());
  }, [newPuzzle]);

  // ── Hint: reveal one random cell of a random unfound word ───────────────
  const handleHint = useCallback(() => {
    if (hints <= 0) return;

    const unfound = puzzle.placedWords.filter(pw => !foundWords.has(pw.word));
    if (unfound.length === 0) return;

    // Pick a random unfound word
    const target = unfound[Math.floor(Math.random() * unfound.length)];

    // Prefer cells not yet hinted for this word
    const unhinted = target.cells.filter(k => !hintCells.has(k));
    const pool     = unhinted.length > 0 ? unhinted : target.cells;
    const pick     = pool[Math.floor(Math.random() * pool.length)];

    setHintCells(prev => new Set([...prev, pick]));
    setHints(h => h - 1);
  }, [hints, puzzle.placedWords, foundWords, hintCells]);

  const clearVoiceListeners = useCallback(() => {
    resultSubscriptionRef.current?.remove();
    endSubscriptionRef.current?.remove();
    errorSubscriptionRef.current?.remove();
    resultSubscriptionRef.current = null;
    endSubscriptionRef.current = null;
    errorSubscriptionRef.current = null;
  }, []);

  const stopVoiceCommands = useCallback(() => {
    setIsVoiceListening(false);
    clearVoiceListeners();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Ignore when recognizer is already inactive.
    }
    resumeWaitModeIfNeeded();
  }, [clearVoiceListeners, resumeWaitModeIfNeeded]);

  const getVoiceCommand = useCallback((transcript: string) => {
    const normalized = transcript
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalized.includes('nuevo juego') || normalized.includes('nueva partida') || normalized.includes('reiniciar')) {
      return 'new-game' as const;
    }
    if (normalized.includes('pista') || normalized.includes('ayuda')) {
      return 'hint' as const;
    }
    if (normalized.includes('reanudar') || normalized.includes('continuar')) {
      return 'resume' as const;
    }
    if (normalized.includes('pausa') || normalized.includes('pausar')) {
      return 'pause' as const;
    }
    if (normalized.includes('regresar') || normalized.includes('volver') || normalized.includes('inicio')) {
      return 'go-home' as const;
    }
    return null;
  }, []);

  const executeVoiceCommand = useCallback((command: 'new-game' | 'hint' | 'pause' | 'resume' | 'go-home') => {
    if (command === 'new-game') {
      setShowNewModal(true);
      return;
    }
    if (command === 'hint') {
      handleHint();
      return;
    }
    if (command === 'pause') {
      setIsPaused(true);
      return;
    }
    if (command === 'go-home') {
      router.push('/games');
      return;
    }
    setIsPaused(false);
  }, [handleHint, router]);

  const startVoiceCommands = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      Alert.alert('Voz no disponible', 'El reconocimiento de voz no esta disponible en este dispositivo.');
      return;
    }

    let permissions = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!permissions.granted) {
      permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    }
    if (!permissions.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso de microfono para usar comandos por voz.');
      return;
    }

    suspendedWaitModeRef.current = suspendWaitModeVoiceDetection();
    if (suspendedWaitModeRef.current) {
      await new Promise(resolve => setTimeout(resolve, 650));
    }
    clearVoiceListeners();

    resultSubscriptionRef.current = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event: ExpoSpeechRecognitionResultEvent) => {
        const transcript = event.results.map(r => r.transcript).join(' ').trim();
        if (!transcript) return;

        const command = getVoiceCommand(transcript);
        if (command) {
          stopVoiceCommands();
          executeVoiceCommand(command);
          return;
        }

        if (event.isFinal) {
          stopVoiceCommands();
          Alert.alert('Comando no reconocido', 'Di: nuevo juego, pista, pausa, reanudar o regresar.');
        }
      },
    );

    endSubscriptionRef.current = ExpoSpeechRecognitionModule.addListener('end', () => {
      setIsVoiceListening(false);
      clearVoiceListeners();
      resumeWaitModeIfNeeded();
    });

    errorSubscriptionRef.current = ExpoSpeechRecognitionModule.addListener('error', () => {
      setIsVoiceListening(false);
      clearVoiceListeners();
      resumeWaitModeIfNeeded();
      Alert.alert('Error de voz', 'No pudimos entender tu voz. Intentalo de nuevo.');
    });

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'es-MX',
        interimResults: true,
        continuous: false,
      });
      setIsVoiceListening(true);
    } catch {
      clearVoiceListeners();
      setIsVoiceListening(false);
      resumeWaitModeIfNeeded();
      Alert.alert('Error de voz', 'No se pudo iniciar el reconocimiento de voz.');
    }
  }, [
    clearVoiceListeners,
    executeVoiceCommand,
    getVoiceCommand,
    resumeWaitModeIfNeeded,
    stopVoiceCommands,
    suspendWaitModeVoiceDetection,
  ]);

  const handleVoicePress = useCallback(() => {
    if (isVoiceListening) {
      stopVoiceCommands();
      return;
    }
    startVoiceCommands();
  }, [isVoiceListening, startVoiceCommands, stopVoiceCommands]);

  useEffect(() => {
    return () => {
      stopVoiceCommands();
    };
  }, [stopVoiceCommands]);
  const flatCells = puzzle.grid.flatMap((row, r) =>
    row.map((letter, c) => ({ letter, r, c, key: `${r}-${c}` }))
  );

  // All cells that belong to already-found words
  const foundCells = new Set(
    puzzle.placedWords
      .filter(w => foundWords.has(w.word))
      .flatMap(w => w.cells),
  );

  // ── Two-step tap selection ───────────────────────────────────────────────
  const handleCellPress = useCallback((r: number, c: number, key: string) => {
    if (isPaused) return;

    // ── STEP 1: no start cell — set this as the anchor ───────────────────
    if (!startCell) {
      setStartCell({ r, c });
      setSelectedCells(new Set([key]));
      return;
    }

    // Tapping the same cell again cancels the selection
    if (startCell.r === r && startCell.c === c) {
      setStartCell(null);
      setSelectedCells(new Set());
      return;
    }

    // ── STEP 2: compute straight-line path to end cell ───────────────────
    const cells = getCellsBetween(startCell.r, startCell.c, r, c);

    if (!cells) {
      // Not a valid direction — silently reset (no flash per spec)
      setStartCell(null);
      setSelectedCells(new Set());
      return;
    }

    // Build the word from the grid letters along the path
    const word        = cells.map(k => {
      const [row, col] = k.split('-').map(Number);
      return puzzle.grid[row][col];
    }).join('');
    const reverseWord = word.split('').reverse().join('');

    // Match against placed words (allow selecting end→start)
    const match = puzzle.placedWords.find(
      pw => !foundWords.has(pw.word) && (pw.word === word || pw.word === reverseWord),
    );

    if (match) {
      // ✅ Correct word — mark found + trigger animations
      setFoundWords(prev => new Set([...prev, match.word]));
      setJustFoundCells(new Set(match.cells));
      setSelectedCells(new Set());
      setStartCell(null);

      // Bounce the word label in the list
      const anim = wordScaleAnims.get(match.word);
      if (anim) {
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.35, duration: 160, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1.0,  duration: 220, useNativeDriver: true }),
        ]).start();
      }

      // Remove the green flash after 500 ms; cells stay blue via cellFound
      foundFlashRef.current = setTimeout(() => setJustFoundCells(new Set()), 500);
    } else {
      // ❌ No word match — flash the path pink then reset
      setSelectedCells(new Set(cells));
      setIsInvalidFlash(true);
      invalidFlashRef.current = setTimeout(() => {
        setIsInvalidFlash(false);
        setSelectedCells(new Set());
        setStartCell(null);
      }, 500);
    }
  }, [isPaused, startCell, puzzle, foundWords, wordScaleAnims]);

  // Split word list into two columns
  const words      = puzzle.placedWords;
  const leftWords  = words.slice(0, Math.ceil(words.length / 2));
  const rightWords = words.slice(Math.ceil(words.length / 2));

  // ── Cell renderer ─────────────────────────────────────────────────────────

  const renderCell = ({ item }: { item: typeof flatCells[0] }) => {
    const isFound     = foundCells.has(item.key);
    const isJustFound = justFoundCells.has(item.key);
    const isHint      = hintCells.has(item.key) && !isFound && !isJustFound;
    const isSelected  = selectedCells.has(item.key);

    return (
      <TouchableOpacity
        style={[
          styles.cell,
          { width: cellSize, height: cellSize },
          isFound     && styles.cellFound,
          isJustFound && styles.cellJustFound,
          isHint      && styles.cellHint,
          isSelected  && (isInvalidFlash ? styles.cellInvalidFlash : styles.cellSelected),
        ]}
        onPress={() => handleCellPress(item.r, item.c, item.key)}
        activeOpacity={0.65}
        accessibilityRole="button"
        accessibilityLabel={`Letra ${item.letter}`}
      >
        <Text
          style={[
            styles.cellText,
            { fontSize: cellFont },
            isFound     && styles.cellTextFound,
            isJustFound && styles.cellTextJustFound,
            isHint      && styles.cellTextHint,
            isSelected  && (isInvalidFlash ? styles.cellTextInvalid : styles.cellTextSelected),
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {item.letter}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Sopa de Letras</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={() => setIsPaused(p => !p)}
            accessibilityLabel={isPaused ? 'Reanudar' : 'Pausar'}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.pauseText}>
              {isPaused ? 'Reanudar' : 'Pausa'}
            </Text>
          </TouchableOpacity>

          <View style={styles.hintsChip}>
            <Ionicons name="bulb-outline" size={16} color="#FFFFFF" />
            <Text style={styles.hintsChipText}>{hints}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.voiceBtn, isVoiceListening && styles.voiceBtnActive]}
        onPress={handleVoicePress}
        accessibilityRole="button"
        accessibilityLabel={isVoiceListening ? 'Detener comandos por voz' : 'Activar comandos por voz'}
      >
        <Ionicons
          name={isVoiceListening ? 'mic' : 'mic-outline'}
          size={22}
          color={isVoiceListening ? '#FFFFFF' : NAVY}
        />
        <Text style={[styles.voiceBtnText, isVoiceListening && styles.voiceBtnTextActive]}>
          {isVoiceListening ? 'Escuchando comando...' : 'Comandos por voz'}
        </Text>
      </TouchableOpacity>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      <View style={[styles.gridWrapper, { paddingHorizontal: SIDE_PAD }]}>
        <View style={styles.gridBorder}>
          <FlatList
            data={flatCells}
            renderItem={renderCell}
            keyExtractor={item => item.key}
            numColumns={8}
            scrollEnabled={false}
          />
        </View>
      </View>

      <View style={styles.sectionDivider} />

      {/* ── Word list ────────────────────────────────────────────────── */}
      <View style={styles.wordSection}>
        <Text style={styles.wordSectionTitle}>Encuentra:</Text>
        <View style={styles.wordColumns}>
          <View style={styles.wordColumn}>
            {leftWords.map(({ word }) => {
              const found     = foundWords.has(word);
              const scaleAnim = wordScaleAnims.get(word);
              return (
                <Animated.Text
                  key={word}
                  style={[
                    styles.wordItem,
                    found && styles.wordFound,
                    scaleAnim && { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  {word}
                </Animated.Text>
              );
            })}
          </View>

          <View style={styles.wordColumnDivider} />

          <View style={styles.wordColumn}>
            {rightWords.map(({ word }) => {
              const found     = foundWords.has(word);
              const scaleAnim = wordScaleAnims.get(word);
              return (
                <Animated.Text
                  key={word}
                  style={[
                    styles.wordItem,
                    found && styles.wordFound,
                    scaleAnim && { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  {word}
                </Animated.Text>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── Bottom buttons ───────────────────────────────────────────── */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.bottomBtn}
          accessibilityRole="button"
          accessibilityLabel="Nuevo juego"
          onPress={() => setShowNewModal(true)}
        >
          <Ionicons name="refresh" size={22} color="#FFFFFF" />
          <Text style={styles.bottomBtnText}>Nuevo juego</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomBtn, hints === 0 && styles.bottomBtnDisabled]}
          onPress={handleHint}
          disabled={hints === 0}
          accessibilityRole="button"
          accessibilityLabel={`Usar pista, ${hints} disponibles`}
        >
          <Text style={styles.bottomBtnText}>💡 Pista</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* ── Win overlay ─────────────────────────────────────────────── */}
      {isGameComplete && (
        <View style={styles.winOverlay}>
          <Animated.View
            style={[
              styles.winCard,
              { transform: [{ scale: winCardAnim }] },
            ]}
          >
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winTitle}>¡Lo lograste!</Text>
            <Text style={styles.winSubtitle}>
              Encontraste todas las palabras
            </Text>
            <Text style={styles.winStats}>
              {puzzle.placedWords.length} de {puzzle.placedWords.length} palabras
            </Text>
            <TouchableOpacity
              style={styles.winBtn}
              onPress={handleNewGame}
              accessibilityRole="button"
              accessibilityLabel="Nuevo juego"
            >
              <Ionicons name="refresh" size={22} color="#FFFFFF" />
              <Text style={styles.winBtnText}>Nuevo Juego</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      {/* ── New-game confirmation modal ────────────────────────────── */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewModal(false)}
        accessibilityViewIsModal
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Ionicons name="refresh-circle-outline" size={52} color={NAVY} />
            <Text style={styles.confirmTitle}>Nuevo juego</Text>
            <Text style={styles.confirmBody}>
              {'¿Desea comenzar un nuevo juego?\nSe perderá el progreso actual.'}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowNewModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmOkBtn}
                onPress={handleNewGame}
                accessibilityRole="button"
                accessibilityLabel="Confirmar"
              >
                <Text style={styles.confirmOkText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 22,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: NAVY,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#C98A00',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pauseText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },
  hintsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },
  hintsChipText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 16,
    marginBottom: 8,
  },

  /* Grid */
  gridWrapper: {
    marginTop: 12,
    marginBottom: 10,
    padding: 8,
    borderRadius: 18,
    backgroundColor: '#F4F8FF',
    borderWidth: 1,
    borderColor: '#D9E5F5',
    shadowColor: '#0B2B57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  gridBorder: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9D8EC',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D7E1EE',
    backgroundColor: '#FBFDFF',
  },
  cellFound: {
    backgroundColor: FOUND_BG,
  },
  cellSelected: {
    backgroundColor: SEL_BG,
  },
  cellText: {
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A2E',
  },
  cellTextFound: {
    color: FOUND_TEXT,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  cellTextSelected: {
    color: NAVY,
  },
  // Flash green when a word is just found (clears after 500 ms)
  cellJustFound: {
    backgroundColor: '#4CAF50',
  },
  cellTextJustFound: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_800ExtraBold',
  },
  // Flash pink when a valid-direction selection has no word match
  cellInvalidFlash: {
    backgroundColor: '#FFCDD2',
  },
  cellTextInvalid: {
    color: '#C0392B',
    fontFamily: 'Montserrat_700Bold',
  },
  // Amber highlight for hint-revealed cells (clears when word is found)
  cellHint: {
    backgroundColor: '#FFE082',
  },
  cellTextHint: {
    color: '#6D4C00',
    fontFamily: 'Montserrat_800ExtraBold',
  },

  /* Section divider */
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 40,
    marginVertical: 4,
  },

  /* Word list */
  wordSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: -6,
  },
  wordSectionTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_400Regular',
    color: '#333333',
    marginBottom: 12,
  },
  wordColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wordColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  wordColumnDivider: {
    width: 1,
    backgroundColor: '#DDDDDD',
    alignSelf: 'stretch',
    marginHorizontal: 16,
  },
  wordItem: {
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#333333',
    letterSpacing: 1,
  },
  wordFound: {
    color: '#2B5BA8',
    textDecorationLine: 'line-through',
    fontFamily: 'Montserrat_700Bold',
  },

  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 2,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D97706',
    backgroundColor: '#F9B233',
  },
  voiceBtnActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  voiceBtnText: {
    fontSize: 17,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
  },
  voiceBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Spacer + Bottom */
  spacer: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  bottomBtnDisabled: {
    backgroundColor: '#AAAAAA',
  },
  bottomBtnText: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },

  /* Win overlay */
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  winCard: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    gap: 10,
  },
  winEmoji: {
    fontSize: 56,
  },
  winTitle: {
    fontSize: 32,
    fontFamily: 'Montserrat_800ExtraBold',
    color: NAVY,
    textAlign: 'center',
  },
  winSubtitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_400Regular',
    color: '#444444',
    textAlign: 'center',
  },
  winStats: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  winBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  winBtnText: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },

  /* New-game confirmation modal */
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCard: {
    width: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  confirmTitle: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 18,
    fontFamily: 'Montserrat_400Regular',
    color: '#444444',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 8,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: NAVY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    textAlign: 'center',
  },
  confirmOkBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmOkText: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
