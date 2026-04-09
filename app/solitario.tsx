import { useWaitMode } from '@/context/wait-mode-context';
import { Ionicons } from '@expo/vector-icons';
import { type EventSubscription } from 'expo-modules-core';
import { useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY  = '#1B3A6B';
const GREEN = '#2E7D32';
const GRAY  = '#546E7A';
const RED   = '#C62828';

// ─── Card types ───────────────────────────────────────────────────────────────

type Suit = '♠' | '♣' | '♥' | '♦';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string; // unique key: 'A♠', '10♥', etc.
}

type Pile = Card[];

interface GameState {
  stock:       Pile;       // draw pile (face-down)
  waste:       Pile;       // turned-over cards
  foundations: [Pile, Pile, Pile, Pile]; // ♠ ♣ ♥ ♦
  tableau:     [Pile, Pile, Pile, Pile, Pile, Pile, Pile]; // 7 columns
}

// ─── Game logic ───────────────────────────────────────────────────────────────

const SUITS: Suit[]  = ['♠', '♣', '♥', '♦'];
const RANKS: Rank[]  = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUE: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

function isRed(suit: Suit) { return suit === '♥' || suit === '♦'; }

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ suit, rank, faceUp: false, id: `${rank}${suit}` });
  return deck;
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealGame(): GameState {
  const deck = shuffle(buildDeck());
  let idx = 0;

  const tableau = Array.from({ length: 7 }, (_, col) => {
    const pile: Card[] = [];
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[idx++] };
      card.faceUp = row === col; // only top card face-up
      pile.push(card);
    }
    return pile;
  }) as GameState['tableau'];

  const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }));

  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  };
}

// Can card be placed on a tableau pile?
function canStackTableau(target: Card | undefined, card: Card): boolean {
  if (!target) return card.rank === 'K'; // empty column only accepts King
  return (
    RANK_VALUE[card.rank] === RANK_VALUE[target.rank] - 1 &&
    isRed(card.suit) !== isRed(target.suit) // alternating colors
  );
}

// Can card be placed on a foundation?
function canStackFoundation(pile: Pile, card: Card): boolean {
  if (pile.length === 0) return card.rank === 'A';
  const top = pile[pile.length - 1];
  return top.suit === card.suit && RANK_VALUE[card.rank] === RANK_VALUE[top.rank] + 1;
}

function isGameWon(foundations: GameState['foundations']): boolean {
  return foundations.every(f => f.length === 13);
}

// ─── Selection type ───────────────────────────────────────────────────────────

type SelectionSource =
  | { zone: 'waste' }
  | { zone: 'foundation'; index: number }
  | { zone: 'tableau'; col: number; row: number };

// ─── Card component ───────────────────────────────────────────────────────────

function CardView({
  card,
  selected = false,
  hint = false,
  onPress,
  width = 48,
}: {
  card: Card;
  selected?: boolean;
  hint?: boolean;
  onPress?: () => void;
  width?: number;
}) {
  const height = Math.round(width * 1.45);
  const suitColor = isRed(card.suit) ? RED : '#111111';
  const rankSize = Math.round(width * 0.28);
  const suitSize = Math.round(width * 0.34);

  if (!card.faceUp) {
    return (
      <View style={[styles.card, styles.cardBack, { width, height, borderRadius: Math.round(width * 0.14) }]} />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${card.rank} de ${card.suit}`}
      style={[
        styles.card,
        { width, height, borderRadius: Math.round(width * 0.14) },
        selected && styles.cardSelected,
        hint && styles.cardHint,
      ]}
    >
      {/* Top-left rank + suit */}
      <View style={styles.cardCornerTL}>
        <Text style={[styles.cardRank, { fontSize: rankSize, color: suitColor }]}>{card.rank}</Text>
        <Text style={[styles.cardSuit, { fontSize: suitSize - 4, color: suitColor }]}>{card.suit}</Text>
      </View>
      {/* Center suit */}
      <Text style={[styles.cardCenter, { fontSize: suitSize + 6, color: suitColor }]}>{card.suit}</Text>
      {/* Bottom-right rank + suit (rotated) */}
      <View style={[styles.cardCornerBR]}>
        <Text style={[styles.cardRank, { fontSize: rankSize, color: suitColor, transform: [{ rotate: '180deg' }] }]}>{card.rank}</Text>
        <Text style={[styles.cardSuit, { fontSize: suitSize - 4, color: suitColor, transform: [{ rotate: '180deg' }] }]}>{card.suit}</Text>
      </View>
    </Pressable>
  );
}

// Empty pile placeholder
function EmptyPile({ label, width = 48 }: { label?: string; width?: number }) {
  const height = Math.round(width * 1.45);
  return (
    <View style={[styles.emptyPile, { width, height, borderRadius: Math.round(width * 0.14) }]}>
      {label ? <Text style={styles.emptyPileLabel}>{label}</Text> : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SolitarioScreen() {
  const router = useRouter();
  const {
    largerText,
    suspendWaitModeVoiceDetection,
    resumeWaitModeVoiceDetection,
  } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 4 : 0);

  const [game,      setGame]      = useState<GameState>(() => dealGame());
  const [selection, setSelection] = useState<SelectionSource | null>(null);
  const [showWin,   setShowWin]   = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [hintSource,    setHintSource]    = useState<string | null>(null); // card id
  const [hintTargetKey, setHintTargetKey] = useState<string | null>(null); // 'f0'-'f3' | 't0'-'t6'
  const [hintMessage,   setHintMessage]   = useState<string>('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultSubscriptionRef = useRef<EventSubscription | null>(null);
  const endSubscriptionRef = useRef<EventSubscription | null>(null);
  const errorSubscriptionRef = useRef<EventSubscription | null>(null);
  const suspendedWaitModeRef = useRef(false);

  // Win check
  useEffect(() => {
    if (isGameWon(game.foundations)) setShowWin(true);
  }, [game.foundations]);

  const flashHint = useCallback((sourceId: string, targetKey: string, msg: string) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintSource(sourceId);
    setHintTargetKey(targetKey);
    setHintMessage(msg);
    hintTimer.current = setTimeout(() => {
      setHintSource(null);
      setHintTargetKey(null);
      setHintMessage('');
    }, 2000);
  }, []);

  const clearHint = useCallback(() => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintSource(null);
    setHintTargetKey(null);
    setHintMessage('');
  }, []);

  // ── Hint: highlight source card + destination zone ───────────────────────
  const handleHint = () => {
    // 1. Waste top card
    if (game.waste.length > 0) {
      const wCard = game.waste[game.waste.length - 1];
      for (let fi = 0; fi < 4; fi++) {
        if (canStackFoundation(game.foundations[fi], wCard)) {
          flashHint(wCard.id, `f${fi}`, `Mueve ${wCard.rank}${wCard.suit} → base`);
          return;
        }
      }
      for (let col = 0; col < 7; col++) {
        const top = game.tableau[col].length > 0 ? game.tableau[col][game.tableau[col].length - 1] : undefined;
        if (canStackTableau(top, wCard)) {
          flashHint(wCard.id, `t${col}`, `Mueve ${wCard.rank}${wCard.suit} → columna ${col + 1}`);
          return;
        }
      }
    }
    // 2. Tableau cards — foundation first, then tableau moves
    for (let col = 0; col < 7; col++) {
      const pile = game.tableau[col];
      for (let row = 0; row < pile.length; row++) {
        if (!pile[row].faceUp) continue;
        const card = pile[row];
        for (let fi = 0; fi < 4; fi++) {
          if (canStackFoundation(game.foundations[fi], card)) {
            flashHint(card.id, `f${fi}`, `Mueve ${card.rank}${card.suit} → base`);
            return;
          }
        }
        for (let tc = 0; tc < 7; tc++) {
          if (tc === col) continue;
          const targetTop = game.tableau[tc].length > 0 ? game.tableau[tc][game.tableau[tc].length - 1] : undefined;
          if (canStackTableau(targetTop, card)) {
            flashHint(card.id, `t${tc}`, `Mueve ${card.rank}${card.suit} → columna ${tc + 1}`);
            return;
          }
        }
      }
    }
    // 3. No moves found
    clearHint();
    setHintMessage(game.stock.length > 0
      ? 'No hay jugadas visibles. Saca una carta del mazo.'
      : 'No hay jugadas disponibles.');
    hintTimer.current = setTimeout(() => setHintMessage(''), 2500);
  };

  const newGame = useCallback(() => {
    setGame(dealGame());
    setSelection(null);
    setShowWin(false);
    setShowNewGameModal(false);
    clearHint();
  }, [clearHint]);

  const requestNewGame = useCallback(() => {
    setShowNewGameModal(true);
  }, []);

  const clearVoiceListeners = useCallback(() => {
    resultSubscriptionRef.current?.remove();
    endSubscriptionRef.current?.remove();
    errorSubscriptionRef.current?.remove();
    resultSubscriptionRef.current = null;
    endSubscriptionRef.current = null;
    errorSubscriptionRef.current = null;
  }, []);

  const resumeWaitModeIfNeeded = useCallback(() => {
    if (!suspendedWaitModeRef.current) return;
    suspendedWaitModeRef.current = false;
    resumeWaitModeVoiceDetection();
  }, [resumeWaitModeVoiceDetection]);

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
    if (normalized.includes('regresar') || normalized.includes('volver') || normalized.includes('inicio')) {
      return 'go-home' as const;
    }
    return null;
  }, []);

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
        if (command === 'new-game') {
          stopVoiceCommands();
          requestNewGame();
          return;
        }
        if (command === 'hint') {
          stopVoiceCommands();
          handleHint();
          return;
        }
        if (command === 'go-home') {
          stopVoiceCommands();
          router.push('/games');
          return;
        }

        if (event.isFinal) {
          stopVoiceCommands();
          Alert.alert('Comando no reconocido', 'Di: nuevo juego, pista o regresar.');
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
    getVoiceCommand,
    handleHint,
    requestNewGame,
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

  // ── Stock tap: flip one card to waste ──────────────────────────────────────
  const handleStockTap = () => {
    setSelection(null);
    setGame(g => {
      if (g.stock.length === 0) {
        // Recycle waste back to stock
        const newStock = [...g.waste].reverse().map(c => ({ ...c, faceUp: false }));
        return { ...g, stock: newStock, waste: [] };
      }
      const card = { ...g.stock[g.stock.length - 1], faceUp: true };
      return {
        ...g,
        stock: g.stock.slice(0, -1),
        waste: [...g.waste, card],
      };
    });
  };

  // ── Resolve a selection: move card(s) to target ───────────────────────────
  const resolveMove = (target: { zone: 'foundation'; index: number } | { zone: 'tableau'; col: number }) => {
    if (!selection) return;

    setGame(g => {
      // Extract card(s) from source
      let movedCards: Card[] = [];
      let newState = { ...g, foundations: [...g.foundations] as GameState['foundations'], tableau: [...g.tableau] as GameState['tableau'] };

      if (selection.zone === 'waste') {
        if (g.waste.length === 0) return g;
        movedCards = [g.waste[g.waste.length - 1]];
        newState.waste = g.waste.slice(0, -1);
      } else if (selection.zone === 'foundation') {
        const fi = selection.index;
        if (g.foundations[fi].length === 0) return g;
        movedCards = [g.foundations[fi][g.foundations[fi].length - 1]];
        const newFoundations = g.foundations.map((f, i) => i === fi ? f.slice(0, -1) : f) as GameState['foundations'];
        newState.foundations = newFoundations;
      } else {
        const { col, row } = selection;
        const pile = g.tableau[col];
        movedCards = pile.slice(row);
        const newTab = g.tableau.map((p, i) => {
          if (i !== col) return p;
          const trimmed = p.slice(0, row);
          // flip new top card if face-down
          if (trimmed.length > 0 && !trimmed[trimmed.length - 1].faceUp)
            trimmed[trimmed.length - 1] = { ...trimmed[trimmed.length - 1], faceUp: true };
          return trimmed;
        }) as GameState['tableau'];
        newState.tableau = newTab;
      }

      const topCard = movedCards[0];

      if (target.zone === 'foundation') {
        if (movedCards.length > 1) return g; // can't move stacks to foundation
        const fi = target.index;
        if (!canStackFoundation(newState.foundations[fi], topCard)) return g;
        const newFoundations = newState.foundations.map((f, i) =>
          i === fi ? [...f, ...movedCards] : f
        ) as GameState['foundations'];
        return { ...newState, foundations: newFoundations };
      } else {
        const col = target.col;
        const targetPile = newState.tableau[col];
        const targetTop = targetPile.length > 0 ? targetPile[targetPile.length - 1] : undefined;
        if (!canStackTableau(targetTop, topCard)) return g;
        const newTab = newState.tableau.map((p, i) =>
          i === col ? [...p, ...movedCards.map(c => ({ ...c, faceUp: true }))] : p
        ) as GameState['tableau'];
        return { ...newState, tableau: newTab };
      }
    });
    setSelection(null);
  };

  // ── Tap handlers ──────────────────────────────────────────────────────────
  const handleWasteTap = () => {
    if (game.waste.length === 0) return;
    if (selection?.zone === 'waste') { setSelection(null); return; }
    setSelection({ zone: 'waste' });
  };

  const handleFoundationTap = (index: number) => {
    if (selection) {
      resolveMove({ zone: 'foundation', index });
    } else {
      if (game.foundations[index].length > 0)
        setSelection({ zone: 'foundation', index });
    }
  };

  const handleTableauTap = (col: number, row: number) => {
    const pile = game.tableau[col];
    const card = pile[row];
    if (!card) return;

    if (!card.faceUp) return; // can't pick face-down cards

    if (selection) {
      // Check if tapping same card → deselect
      if (selection.zone === 'tableau' && selection.col === col && selection.row === row) {
        setSelection(null);
        return;
      }
      // Try to drop on this column (at the end)
      resolveMove({ zone: 'tableau', col });
    } else {
      setSelection({ zone: 'tableau', col, row });
    }
  };

  // ── Auto-move top card to foundation ─────────────────────────────────────
  const autoToFoundation = (card: Card, source: SelectionSource): boolean => {
    for (let fi = 0; fi < 4; fi++) {
      if (canStackFoundation(game.foundations[fi], card)) {
        setSelection(source);
        // Tiny timeout so state is set before resolveMove reads it
        setTimeout(() => resolveMove({ zone: 'foundation', index: fi }), 0);
        return true;
      }
    }
    return false;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isSelected = (src: SelectionSource): boolean => {
    if (!selection) return false;
    if (selection.zone !== src.zone) return false;
    if (src.zone === 'waste' && selection.zone === 'waste') return true;
    if (src.zone === 'foundation' && selection.zone === 'foundation') return selection.index === src.index;
    if (src.zone === 'tableau' && selection.zone === 'tableau') return selection.col === src.col && selection.row === src.row;
    return false;
  };

  // Card dimensions — responsive to screen
  const CARD_W = 50;
  const OVERLAP = 26; // vertical overlap between stacked tableau cards

  const foundationSuits: Suit[] = ['♠', '♣', '♥', '♦'];

  return (
    <SafeAreaView style={styles.screen}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.push('/games')}
          accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.title, { fontSize: fs(26) }]}>Solitario</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Top row: stock / waste / foundations ── */}
      <View style={styles.topRow}>
        {/* Stock */}
        <Pressable onPress={handleStockTap} accessibilityRole="button" accessibilityLabel="Mazo">
          {game.stock.length > 0
            ? <View style={[styles.card, styles.cardBack, { width: CARD_W, height: Math.round(CARD_W * 1.45), borderRadius: Math.round(CARD_W * 0.14) }]} />
            : <EmptyPile label="↺" width={CARD_W} />
          }
        </Pressable>

        {/* Waste */}
        <Pressable onPress={handleWasteTap} accessibilityRole="button" accessibilityLabel="Descarte">
          {game.waste.length > 0
            ? <CardView
                card={game.waste[game.waste.length - 1]}
                selected={isSelected({ zone: 'waste' })}
                hint={hintSource === game.waste[game.waste.length - 1]?.id}
                onPress={handleWasteTap}
                width={CARD_W}
              />
            : <EmptyPile width={CARD_W} />
          }
        </Pressable>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Foundations */}
        {foundationSuits.map((suit, fi) => {
          const pile = game.foundations[fi];
          const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
          const isTarget = hintTargetKey === `f${fi}`;
          return (
            <Pressable key={suit} onPress={() => handleFoundationTap(fi)}
              accessibilityRole="button" accessibilityLabel={`Base ${suit}`}
              style={isTarget && styles.hintTargetZone}>
              {topCard
                ? <CardView card={topCard} selected={isSelected({ zone: 'foundation', index: fi })} onPress={() => handleFoundationTap(fi)} width={CARD_W} />
                : <EmptyPile label={suit} width={CARD_W} />
              }
            </Pressable>
          );
        })}
      </View>

      {/* ── Tableau ── */}
      <ScrollView style={styles.tableauScroll} contentContainerStyle={styles.tableauContent} showsVerticalScrollIndicator={false}>
        <View style={styles.tableauRow}>
          {game.tableau.map((pile, col) => {
            const colHeight = pile.length === 0
              ? Math.round(CARD_W * 1.45) + 8
              : Math.round(CARD_W * 1.45) + (pile.length - 1) * OVERLAP + 8;
            return (
              <View key={col} style={[styles.tableauCol, { height: colHeight, width: CARD_W + 2 }, hintTargetKey === `t${col}` && styles.hintTargetCol]}>
                {pile.length === 0
                  ? <Pressable onPress={() => {
                      if (selection) resolveMove({ zone: 'tableau', col });
                    }}>
                      <EmptyPile width={CARD_W} />
                    </Pressable>
                  : pile.map((card, row) => {
                      const isSelectedCard = isSelected({ zone: 'tableau', col, row });
                      const isHinted = hintSource === card.id;
                      return (
                        <View key={card.id} style={[
                          styles.tableauCard,
                          { top: row * OVERLAP },
                          isSelectedCard && styles.tableauCardSelected,
                          isHinted && styles.tableauCardHinted,
                        ]}>
                          <CardView
                            card={card}
                            selected={isSelectedCard}
                            hint={isHinted}
                            onPress={() => handleTableauTap(col, row)}
                            width={CARD_W}
                          />
                        </View>
                      );
                    })
                }
                {/* Invisible drop target for the column */}
                {pile.length > 0 && selection && (
                  <Pressable
                    style={[styles.dropTarget, { top: pile.length * OVERLAP + Math.round(CARD_W * 1.45) - OVERLAP, width: CARD_W }]}
                    onPress={() => resolveMove({ zone: 'tableau', col })}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Hint message ── */}
      {hintMessage !== '' && (
        <View style={styles.hintStrip}>
          <Ionicons name="bulb-outline" size={16} color="#1B5E20" />
          <Text style={[styles.hintStripText, { fontSize: fs(13) }]}>{hintMessage}</Text>
        </View>
      )}

      {/* ── Bottom buttons ── */}
      <Pressable
        style={[styles.voiceBtn, isVoiceListening && styles.voiceBtnActive]}
        onPress={handleVoicePress}
        accessibilityRole="button"
        accessibilityLabel={isVoiceListening ? 'Detener comandos de voz' : 'Activar comandos de voz'}
      >
        <Ionicons name={isVoiceListening ? 'mic' : 'mic-outline'} size={22} color={isVoiceListening ? '#FFFFFF' : NAVY} />
        <Text style={[styles.voiceBtnText, isVoiceListening && styles.voiceBtnTextActive, { fontSize: fs(16) }]}>
          {isVoiceListening ? 'Escuchando comando...' : 'Comandos por voz'}
        </Text>
      </Pressable>

      <View style={styles.bottomRow}>
        <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={requestNewGame} accessibilityRole="button" accessibilityLabel="Nuevo juego">
          <Ionicons name="refresh" size={22} color="#FFFFFF" />
          <Text style={[styles.actionBtnText, { fontSize: fs(16) }]}>Nuevo juego</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={handleHint} accessibilityRole="button" accessibilityLabel="Pista">
          <Ionicons name="bulb-outline" size={22} color={NAVY} />
          <Text style={[styles.actionBtnText, styles.actionBtnTextOutline, { fontSize: fs(16) }]}>Pista</Text>
        </Pressable>
      </View>

      <Modal
        visible={showNewGameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewGameModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Ionicons name="refresh-circle-outline" size={52} color={NAVY} />
            <Text style={styles.confirmTitle}>Nuevo juego</Text>
            <Text style={styles.confirmBody}>
              {'¿Desea comenzar un nuevo juego?\nSe perderá el progreso actual.'}
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={styles.confirmCancelBtn}
                onPress={() => setShowNewGameModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.confirmOkBtn}
                onPress={newGame}
                accessibilityRole="button"
                accessibilityLabel="Confirmar"
              >
                <Text style={styles.confirmOkText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Win modal ── */}
      <Modal visible={showWin} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🏆</Text>
            <Text style={[styles.modalTitle, { fontSize: fs(28) }]}>¡Ganaste!</Text>
            <Text style={[styles.modalBody, { fontSize: fs(16) }]}>
              Completaste todas las bases. ¡Excelente partida!
            </Text>
            <Pressable style={styles.modalBtn} onPress={newGame}
              accessibilityRole="button" accessibilityLabel="Nueva partida">
              <Ionicons name="refresh" size={22} color="#FFFFFF" />
              <Text style={[styles.modalBtnText, { fontSize: fs(18) }]}>Nueva partida</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F0F4F8',
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
  title: {
    flex: 1,
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFFFFF',
  },

  /* Top row */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#1B3A6B22',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#BBBBBB',
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardBack: {
    backgroundColor: NAVY,
    borderColor: '#102A52',
  },
  cardSelected: {
    borderColor: '#F9A825',
    borderWidth: 2.5,
    backgroundColor: '#FFFDE7',
  },
  cardHint: {
    borderColor: '#2E7D32',
    borderWidth: 2.5,
    backgroundColor: '#F1F8E9',
  },
  cardCornerTL: {
    position: 'absolute',
    top: 3,
    left: 4,
    alignItems: 'center',
  },
  cardCornerBR: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    alignItems: 'center',
  },
  cardRank: {
    fontFamily: 'Montserrat_800ExtraBold',
    lineHeight: 18,
  },
  cardSuit: {
    lineHeight: 16,
  },
  cardCenter: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
  },

  /* Empty pile placeholder */
  emptyPile: {
    borderWidth: 1.5,
    borderColor: '#AAAAAA',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPileLabel: {
    fontSize: 20,
    color: '#AAAAAA',
    fontFamily: 'Montserrat_700Bold',
  },

  /* Tableau */
  tableauScroll: {
    flex: 1,
  },
  tableauContent: {
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 12,
  },
  tableauRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tableauCol: {
    position: 'relative',
  },
  tableauCard: {
    position: 'absolute',
  },
  tableauCardSelected: {
    zIndex: 100,
  },
  tableauCardHinted: {
    zIndex: 99,
  },
  tableauCardHint: {
    zIndex: 99,
  },
  hintTargetCol: {
    borderRadius: 8,
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
  },
  hintTargetZone: {
    borderRadius: 8,
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
  },
  hintStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F8E9',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#A5D6A7',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  hintStripText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#1B5E20',
    flex: 1,
  },
  dropTarget: {
    position: 'absolute',
    height: 20,
    backgroundColor: 'transparent',
    zIndex: 50,
  },

  /* Bottom row */
  voiceBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: NAVY,
    backgroundColor: '#FFFFFF',
  },
  voiceBtnActive: {
    backgroundColor: NAVY,
  },
  voiceBtnText: {
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
  },
  voiceBtnTextActive: {
    color: '#FFFFFF',
  },
  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  actionBtnPrimary: {
    backgroundColor: NAVY,
  },
  actionBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: NAVY,
    shadowOpacity: 0.06,
    elevation: 1,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
  },
  actionBtnTextOutline: {
    color: NAVY,
  },

  /* Win modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalEmoji: {
    fontSize: 56,
  },
  modalTitle: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: NAVY,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: 'Montserrat_400Regular',
    color: '#555555',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
  },
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
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmTitle: {
    marginTop: 8,
    fontSize: 28,
    fontFamily: 'Montserrat_800ExtraBold',
    color: NAVY,
    textAlign: 'center',
  },
  confirmBody: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: 'Montserrat_400Regular',
    color: '#444444',
    textAlign: 'center',
  },
  confirmButtons: {
    marginTop: 20,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: '#333333',
  },
  confirmOkBtn: {
    flex: 1,
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmOkText: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },
});
