import { useWaitMode } from '@/context/wait-mode-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
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

// ─── Domino logic ─────────────────────────────────────────────────────────────

type Tile = [number, number]; // [left, right]

/** Build a full set of 28 domino tiles (0-0 … 6-6). */
function fullSet(): Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a++)
    for (let b = a; b <= 6; b++)
      tiles.push([a, b]);
  return tiles;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal: player gets 7, CPU gets 7, rest is boneyard. */
function deal(): { player: Tile[]; cpu: Tile[]; boneyard: Tile[] } {
  const tiles = shuffle(fullSet());
  return {
    player:   tiles.slice(0, 7),
    cpu:      tiles.slice(7, 14),
    boneyard: tiles.slice(14),
  };
}

/**
 * A "chain" is stored as an ordered array of tiles (as placed).
 * leftEnd / rightEnd are the exposed pip values at each end.
 */
type Chain = {
  tiles: Tile[];
  leftEnd: number;
  rightEnd: number;
};

function initChain(tile: Tile): Chain {
  return { tiles: [tile], leftEnd: tile[0], rightEnd: tile[1] };
}

/** Returns new chain if tile can be placed, otherwise null. */
function tryPlace(chain: Chain, tile: Tile): Chain | null {
  const [a, b] = tile;
  if (a === chain.rightEnd)
    return { tiles: [...chain.tiles, tile], leftEnd: chain.leftEnd, rightEnd: b };
  if (b === chain.rightEnd)
    return { tiles: [...chain.tiles, tile], leftEnd: chain.leftEnd, rightEnd: a };
  if (b === chain.leftEnd)
    return { tiles: [tile, ...chain.tiles], leftEnd: a, rightEnd: chain.rightEnd };
  if (a === chain.leftEnd)
    return { tiles: [tile, ...chain.tiles], leftEnd: b, rightEnd: chain.rightEnd };
  return null;
}

function canPlay(chain: Chain | null, tile: Tile): boolean {
  if (!chain) return true;
  const [a, b] = tile;
  return a === chain.leftEnd || b === chain.leftEnd ||
         a === chain.rightEnd || b === chain.rightEnd;
}

type CpuTurnResult = {
  hand: Tile[];
  boneyard: Tile[];
  chain: Chain | null;
  passed: boolean;
  playedTile: Tile | null;
  drewFromBoneyard: boolean;
};

/** Simple CPU: plays first valid tile, or draws once from boneyard, or passes. */
function cpuTurn(
  hand: Tile[],
  boneyard: Tile[],
  chain: Chain | null,
): CpuTurnResult {
  for (let i = 0; i < hand.length; i++) {
    const result = chain ? tryPlace(chain, hand[i]) : initChain(hand[i]);
    if (result) {
      const newHand = hand.filter((_, idx) => idx !== i);
      return { hand: newHand, boneyard, chain: result, passed: false, playedTile: hand[i], drewFromBoneyard: false };
    }
  }
  // Draw one from boneyard
  if (boneyard.length > 0) {
    const drawn = boneyard[0];
    const newBoneyard = boneyard.slice(1);
    const newHand = [...hand, drawn];
    for (let i = 0; i < newHand.length; i++) {
      const result = chain ? tryPlace(chain, newHand[i]) : initChain(newHand[i]);
      if (result) {
        return { hand: newHand.filter((_, idx) => idx !== i), boneyard: newBoneyard, chain: result, passed: false, playedTile: newHand[i], drewFromBoneyard: true };
      }
    }
    return { hand: newHand, boneyard: newBoneyard, chain, passed: false, playedTile: null, drewFromBoneyard: true };
  }
  return { hand, boneyard, chain, passed: true, playedTile: null, drewFromBoneyard: false };
}

function cpuMessage(r: CpuTurnResult): string {
  if (r.passed) return 'La CPU no pudo jugar y pasó su turno.';
  if (r.playedTile) {
    const [a, b] = r.playedTile;
    return r.drewFromBoneyard
      ? `La CPU robó una ficha y jugó el ${a}–${b}.`
      : `La CPU jugó el ${a}–${b}.`;
  }
  if (r.drewFromBoneyard) return 'La CPU robó una ficha del mazo.';
  return '';
}

// ─── Dot layout ───────────────────────────────────────────────────────────────

/** Returns dot positions for 0-6 in a 3×3 grid. Position index = [row*3+col]. */
const DOT_POSITIONS: boolean[][] = [
  // 0  1  2  3  4  5  6  7  8   (3×3 grid positions, row-major)
  [false,false,false, false,false,false, false,false,false], // 0
  [false,false,false, false,true, false, false,false,false], // 1
  [false,false,true,  false,false,false, true, false,false], // 2
  [false,false,true,  false,true, false, true, false,false], // 3
  [true, false,true,  false,false,false, true, false,true ], // 4
  [true, false,true,  false,true, false, true, false,true ], // 5
  [true, false,true,  true, false,true,  true, false,true ], // 6
];

function PipFace({ value, size }: { value: number; size: number }) {
  const dots = DOT_POSITIONS[value];
  const dotSize = Math.max(4, Math.floor(size * 0.13));
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', padding: size * 0.1 }}>
      {dots.map((active, i) => (
        <View
          key={i}
          style={{
            width: '33.33%',
            height: '33.33%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {active && (
            <View style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: '#1A1A1A',
            }} />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Domino tile component ────────────────────────────────────────────────────

function DominoTile({
  tile,
  size = 56,
  selected = false,
  highlight = false,
  onPress,
  horizontal = true,
  disabled = false,
}: {
  tile: Tile;
  size?: number;
  selected?: boolean;
  highlight?: boolean;
  onPress?: () => void;
  horizontal?: boolean;
  disabled?: boolean;
}) {
  const [a, b] = tile;
  const faceSize = size;

  const inner = horizontal ? (
    <View style={[styles.tileHorizontal, selected && styles.tileSelected, highlight && styles.tileHighlight, disabled && styles.tileDisabled, { borderRadius: size * 0.18 }]}>
      <PipFace value={a} size={faceSize} />
      <View style={styles.tileDividerV} />
      <PipFace value={b} size={faceSize} />
    </View>
  ) : (
    <View style={[styles.tileVertical, selected && styles.tileSelected, highlight && styles.tileHighlight, { borderRadius: size * 0.18, width: faceSize + 8 }]}>
      <PipFace value={a} size={faceSize} />
      <View style={styles.tileDividerH} />
      <PipFace value={b} size={faceSize} />
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ficha ${a}-${b}`}>
      {inner}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type GameStatus = 'playing' | 'player_win' | 'cpu_win' | 'draw';

export default function DominoScreen() {
  const router   = useRouter();
  const { largerText } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 4 : 0);

  const startNew = useCallback(() => {
    const { player, cpu, boneyard } = deal();
    // The player with the highest double starts
    let startChain: Chain | null = null;
    let startPlayer = [...player];
    let startCpu    = [...cpu];

    const highDouble = (hand: Tile[]): number => {
      let best = -1;
      hand.forEach(([a, b]) => { if (a === b && a > best) best = a; });
      return best;
    };
    const pBest = highDouble(player);
    const cBest = highDouble(cpu);

    if (pBest >= cBest && pBest >= 0) {
      const idx = player.findIndex(([a, b]) => a === b && a === pBest);
      startChain  = initChain(player[idx]);
      startPlayer = player.filter((_, i) => i !== idx);
    } else if (cBest > pBest && cBest >= 0) {
      const idx = cpu.findIndex(([a, b]) => a === b && a === cBest);
      startChain = initChain(cpu[idx]);
      startCpu   = cpu.filter((_, i) => i !== idx);
    }
    // else: nobody has a double → no chain yet, player goes first

    return { player: startPlayer, cpu: startCpu, boneyard, chain: startChain };
  }, []);

  const initial = startNew();
  const [playerHand,  setPlayerHand]  = useState<Tile[]>(initial.player);
  const [cpuHand,     setCpuHand]     = useState<Tile[]>(initial.cpu);
  const [boneyard,    setBoneyard]    = useState<Tile[]>(initial.boneyard);
  const [chain,       setChain]       = useState<Chain | null>(initial.chain);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [message,     setMessage]     = useState<string>('');
  const [status,      setStatus]      = useState<GameStatus>('playing');
  const [showWinModal, setShowWinModal] = useState(false);
  const [cpuPassed,   setCpuPassed]   = useState(false);
  const [cpuLastTile,  setCpuLastTile] = useState<Tile | null>(null);
  const cpuHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCpuHighlight = (tile: Tile | null) => {
    if (cpuHighlightTimer.current) clearTimeout(cpuHighlightTimer.current);
    if (tile) {
      setCpuLastTile(tile);
      cpuHighlightTimer.current = setTimeout(() => setCpuLastTile(null), 800);
    } else {
      setCpuLastTile(null);
    }
  };

  const checkWin = useCallback((pHand: Tile[], cHand: Tile[], currentChain: Chain | null): GameStatus => {
    if (pHand.length === 0) return 'player_win';
    if (cHand.length === 0) return 'cpu_win';
    const pCan = pHand.some(t => canPlay(currentChain, t));
    const cCan = cHand.some(t => canPlay(currentChain, t));
    if (!pCan && !cCan) return 'draw';
    return 'playing';
  }, []);

  const handleTileSelect = (idx: number) => {
    if (status !== 'playing') return;
    const tile = playerHand[idx];
    if (!canPlay(chain, tile)) {
      setMessage('Esta ficha no se puede jugar aquí.');
      return;
    }
    setSelected(idx);
    setMessage('');
  };

  const handlePlaySelected = () => {
    if (selected === null || status !== 'playing') return;
    const tile = playerHand[selected];
    const newChain = chain ? tryPlace(chain, tile) : initChain(tile);
    if (!newChain) { setMessage('No se puede colocar ahí.'); return; }

    const newPlayerHand = playerHand.filter((_, i) => i !== selected);
    setPlayerHand(newPlayerHand);
    setChain(newChain);
    setSelected(null);
    setMessage('');

    // Check win
    const result = checkWin(newPlayerHand, cpuHand, newChain);
    if (result !== 'playing') { setStatus(result); setShowWinModal(true); return; }

    // CPU turn
    const cpuResult = cpuTurn(cpuHand, boneyard, newChain);
    setCpuHand(cpuResult.hand);
    setBoneyard(cpuResult.boneyard);
    setChain(cpuResult.chain);
    setCpuPassed(cpuResult.passed);
    triggerCpuHighlight(cpuResult.playedTile);
    setMessage(cpuMessage(cpuResult));

    const result2 = checkWin(newPlayerHand, cpuResult.hand, cpuResult.chain);
    if (result2 !== 'playing') { setStatus(result2); setShowWinModal(true); }
  };

  const handlePass = () => {
    if (status !== 'playing') return;
    if (playerHand.some(t => canPlay(chain, t))) {
      setMessage('Tienes fichas jugables. ¡Úsalas!');
      return;
    }
    // Draw from boneyard if available
    if (boneyard.length > 0) {
      const drawn = boneyard[0];
      setPlayerHand(h => [...h, drawn]);
      setBoneyard(b => b.slice(1));
      setMessage(`Robaste la ficha ${drawn[0]}-${drawn[1]}.`);
      return;
    }
    const cpuResult = cpuTurn(cpuHand, boneyard, chain);
    setCpuHand(cpuResult.hand);
    setBoneyard(cpuResult.boneyard);
    setChain(cpuResult.chain);
    setCpuPassed(cpuResult.passed);
    triggerCpuHighlight(cpuResult.playedTile);
    setMessage(`Pasaste tu turno. ${cpuMessage(cpuResult)}`.trim());

    const result = checkWin(playerHand, cpuResult.hand, cpuResult.chain);
    if (result !== 'playing') { setStatus(result); setShowWinModal(true); }
  };

  const handleNewGame = () => {
    const g = startNew();
    setPlayerHand(g.player);
    setCpuHand(g.cpu);
    setBoneyard(g.boneyard);
    setChain(g.chain);
    setSelected(null);
    setMessage('');
    setStatus('playing');
    setShowWinModal(false);
    setCpuPassed(false);
    triggerCpuHighlight(null);
  };

  const winText: Record<GameStatus, string> = {
    player_win: '¡Ganaste! 🎉',
    cpu_win:    'La CPU ganó esta vez',
    draw:       'Empate — nadie puede jugar',
    playing:    '',
  };

  // ── Board: show last 5 tiles of chain to avoid overflow ──────────────────
  const boardTiles = chain ? chain.tiles.slice(-5) : [];

  return (
    <SafeAreaView style={styles.screen}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.push('/games')}
          accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.title, { fontSize: fs(26) }]}>Dominó</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Scoreboard strip ── */}
      <View style={styles.scoreStrip}>
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreLabel, { fontSize: fs(12) }]}>TÚ</Text>
          <Text style={[styles.scoreValue, { fontSize: fs(20) }]}>{playerHand.length}</Text>
          <Text style={[styles.scoreLabel, { fontSize: fs(12) }]}>fichas</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreLabel, { fontSize: fs(12) }]}>MAZO</Text>
          <Text style={[styles.scoreValue, { fontSize: fs(20) }]}>{boneyard.length}</Text>
          <Text style={[styles.scoreLabel, { fontSize: fs(12) }]}>fichas</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreLabel, { fontSize: fs(12) }]}>CPU</Text>
          <Text style={[styles.scoreValue, { fontSize: fs(20) }]}>{cpuHand.length}</Text>
          <Text style={[styles.scoreLabel, { fontSize: fs(12) }]}>fichas</Text>
        </View>
      </View>

      {/* ── Board area ── */}
      <View style={styles.boardArea}>
        {chain === null ? (
          <View style={styles.boardEmpty}>
            <Ionicons name="grid-outline" size={48} color="#CCCCCC" />
            <Text style={[styles.boardEmptyText, { fontSize: fs(16) }]}>
              Selecciona una ficha para empezar
            </Text>
          </View>
        ) : (
          <View style={styles.boardChain}>
            {boardTiles.map((tile, i) => (
              <DominoTile
                key={i}
                tile={tile}
                size={44}
                horizontal={false}
                highlight={cpuLastTile !== null && tile[0] === cpuLastTile[0] && tile[1] === cpuLastTile[1]}
              />
            ))}
            {chain.tiles.length > 5 && (
              <Text style={styles.moreText}>…</Text>
            )}
          </View>
        )}
        {/* Open ends indicator */}
        {chain && (
          <View style={styles.endsRow}>
            <Text style={[styles.endsText, { fontSize: fs(14) }]}>
              {`Extremos:  ${chain.leftEnd}  —  ${chain.rightEnd}`}
            </Text>
          </View>
        )}
      </View>

      {/* ── Message strip ── */}
      {message !== '' && (
        <View style={styles.messageStrip}>
          <Text style={[styles.messageText, { fontSize: fs(14) }]}>{message}</Text>
        </View>
      )}

      {/* ── Player hand ── */}
      <View style={styles.handSection}>
        <Text style={[styles.handLabel, { fontSize: fs(14) }]}>Tus fichas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handRow}>
          {playerHand.map((tile, i) => (
            <DominoTile
              key={i}
              tile={tile}
              size={52}
              selected={selected === i}
              disabled={!canPlay(chain, tile)}
              onPress={() => handleTileSelect(i)}
              horizontal={false}
            />
          ))}
          {playerHand.length === 0 && (
            <Text style={[styles.emptyHand, { fontSize: fs(15) }]}>Sin fichas</Text>
          )}
        </ScrollView>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.bottomRow}>
        {/* Primary: play selected tile */}
        <Pressable
          style={[styles.actionBtn, styles.actionBtnPrimary, (selected === null || status !== 'playing') && styles.actionBtnDisabled]}
          onPress={handlePlaySelected}
          disabled={selected === null || status !== 'playing'}
          accessibilityRole="button"
          accessibilityLabel="Jugar ficha seleccionada"
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
          <Text style={[styles.actionBtnText, { fontSize: fs(17) }]}>Jugar ficha</Text>
        </Pressable>
        {/* Secondary row: pass + new game */}
        <View style={styles.secondaryRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnPass, styles.actionBtnSm]}
            onPress={handlePass}
            disabled={status !== 'playing'}
            accessibilityRole="button"
            accessibilityLabel="Pasar turno"
          >
            <Ionicons name="play-skip-forward-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.actionBtnText, { fontSize: fs(15) }]}>Pasar</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnNew, styles.actionBtnSm]}
            onPress={handleNewGame}
            accessibilityRole="button"
            accessibilityLabel="Nuevo juego"
          >
            <Ionicons name="refresh" size={20} color={NAVY} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextOutline, { fontSize: fs(15) }]}>Nuevo</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Win modal ── */}
      <Modal visible={showWinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>
              {status === 'player_win' ? '🏆' : status === 'draw' ? '🤝' : '🤖'}
            </Text>
            <Text style={[styles.modalTitle, { fontSize: fs(28) }]}>{winText[status]}</Text>
            <Text style={[styles.modalBody, { fontSize: fs(16) }]}>
              {status === 'player_win'
                ? 'Excelente partida. ¡Eres el campeón!'
                : status === 'cpu_win'
                ? 'La CPU terminó sus fichas primero.'
                : 'Ninguno puede colocar más fichas.'}
            </Text>
            <Pressable style={styles.modalBtn} onPress={handleNewGame}
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
    backgroundColor: '#FFFFFF',
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

  /* Score strip */
  scoreStrip: {
    flexDirection: 'row',
    backgroundColor: '#F0F4FF',
    paddingVertical: 6,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD',
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  scoreDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#CCCCCC',
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  scoreLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#888888',
    letterSpacing: 0.6,
  },
  scoreValue: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: NAVY,
  },

  /* Board */
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  boardEmpty: {
    alignItems: 'center',
    gap: 12,
  },
  boardEmptyText: {
    fontFamily: 'Montserrat_400Regular',
    color: '#AAAAAA',
    textAlign: 'center',
  },
  boardChain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F8FF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDE3F0',
    width: '100%',
  },
  moreText: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 28,
    color: '#AAAAAA',
    alignSelf: 'center',
  },
  endsRow: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 18,
    alignSelf: 'center',
  },
  endsText: {
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    letterSpacing: 0.5,
  },

  /* Message */
  messageStrip: {
    backgroundColor: '#FFF8E1',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FFE082',
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  messageText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#6D4C00',
    textAlign: 'center',
  },

  /* Hand */
  handSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
  handLabel: {
    fontFamily: 'Montserrat_700Bold',
    color: '#444444',
    letterSpacing: 0.3,
  },
  handRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 10,
    alignItems: 'center',
  },
  emptyHand: {
    fontFamily: 'Montserrat_400Regular',
    color: '#AAAAAA',
  },

  /* Tiles */
  tileHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tileVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tileSelected: {
    borderColor: NAVY,
    borderWidth: 3,
    backgroundColor: '#E8F0FE',
  },
  tileHighlight: {
    borderColor: '#F9A825',
    borderWidth: 3,
    backgroundColor: '#FFFDE7',
  },
  tileDisabled: {
    opacity: 0.38,
  },
  tileDividerV: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: '#CCCCCC',
  },
  tileDividerH: {
    height: 2,
    alignSelf: 'stretch',
    backgroundColor: '#CCCCCC',
  },

  /* Bottom row */
  bottomRow: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 8,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  actionBtnPrimary: {
    backgroundColor: GREEN,
  },
  actionBtnSm: {
    flex: 1,
    paddingVertical: 13,
  },
  actionBtnPass: {
    backgroundColor: GRAY,
  },
  actionBtnNew: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: NAVY,
    shadowOpacity: 0.06,
    elevation: 1,
  },
  actionBtnDisabled: {
    opacity: 0.45,
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
});
