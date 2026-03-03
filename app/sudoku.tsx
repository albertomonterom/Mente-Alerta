import { useWaitMode } from '@/context/wait-mode-context';
import { useRouter } from 'expo-router';
import { useSudoku } from '@/context/sudoku-context'; 
import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Board,
  generateSudoku,
  hasConflict,
  isBoardComplete,
} from '@/utils/sudoku-generator';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY       = '#1B3A6B';
const GREEN      = '#2E7D32';
const RED        = '#C0392B';
const LIGHT_BLUE = '#E8F0FE';
const SELECTED_BG = '#90CAF9';
const CONFLICT_BG = '#FFCDD2';
const GIVEN_BG   = '#FFFFFF';
const EMPTY_BG   = '#F5F8FF';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE   = Math.min(SCREEN_WIDTH - 32, 380);
const CELL_SIZE    = Math.floor(BOARD_SIZE / 9);
const NUM_BTN_SIZE = Math.floor((BOARD_SIZE - 4 * 10) / 5);

// ─── Component ────────────────────────────────────────────────────────────────

export default function SudokuScreen() {
  const router = useRouter();
  const { largerText, highContrast } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 4 : 0);

  const { playerBoard, solution, given, setPlayerBoard, newGame } = useSudoku();
  
  const [selected, setSelected]       = useState<[number, number] | null>(null);
  const [conflicts, setConflicts]     = useState<Set<string>>(new Set());
  const [showWin, setShowWin]         = useState(false);

  // ── New game ────────────────────────────────────────────────────────────────

  

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCellPress = (row: number, col: number) => setSelected([row, col]);

  const handleNumberPress = (num: number | null) => {
    if (!selected) return;
    const [row, col] = selected;
    if (given[row][col]) return;

    const newBoard = playerBoard.map((r) => [...r]);
    newBoard[row][col] = num;
    setPlayerBoard(newBoard);

    const newConflicts = new Set<string>();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = newBoard[r][c];
        if (val !== null && !given[r][c] && hasConflict(newBoard, r, c, val)) {
          newConflicts.add(`${r}-${c}`);
        }
      }
    }
    setConflicts(newConflicts);

    if (num !== null && isBoardComplete(newBoard, solution)) setShowWin(true);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getCellBg = (row: number, col: number): string => {
    if (selected?.[0] === row && selected?.[1] === col) return SELECTED_BG;
    if (conflicts.has(`${row}-${col}`)) return CONFLICT_BG;
    if (given[row]?.[col]) return GIVEN_BG;
    if (selected) {
      const [sr, sc] = selected;
      const sameBox = Math.floor(sr / 3) === Math.floor(row / 3) &&
                      Math.floor(sc / 3) === Math.floor(col / 3);
      if (sr === row || sc === col || sameBox) return LIGHT_BLUE;
    }
    return EMPTY_BG;
  };

  const getBoxBorders = (row: number, col: number) => ({
    borderRightWidth:  col === 2 || col === 5 ? 2.5 : 0.5,
    borderBottomWidth: row === 2 || row === 5 ? 2.5 : 0.5,
    borderLeftWidth:   col === 0 ? 2.5 : 0.5,
    borderTopWidth:    row === 0 ? 2.5 : 0.5,
  });

  if (!playerBoard.length) return null;

  return (
    <View style={[styles.screen, highContrast && { backgroundColor: '#FFFFFF' }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.push('/games')}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={[styles.backBtnText, { fontSize: fs(22) }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { fontSize: fs(26) }]}>Sudoku</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Board ── */}
        <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {playerBoard.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isGiven    = given[rIdx]?.[cIdx];
              const isConflict = conflicts.has(`${rIdx}-${cIdx}`);
              return (
                <Pressable
                  key={`${rIdx}-${cIdx}`}
                  style={[
                    styles.cell,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: getCellBg(rIdx, cIdx),
                      borderColor: highContrast ? '#000000' : '#90A4AE',
                      ...getBoxBorders(rIdx, cIdx),
                    },
                  ]}
                  onPress={() => handleCellPress(rIdx, cIdx)}
                  accessibilityRole="button"
                  accessibilityLabel={`Celda fila ${rIdx + 1} columna ${cIdx + 1}, valor ${cell ?? 'vacío'}`}
                >
                  {cell !== null && (
                    <Text
                      style={[
                        isGiven ? styles.cellTextGiven : styles.cellTextPlayer,
                        {
                          fontSize: fs(CELL_SIZE * 0.48),
                          color: isConflict ? RED : isGiven ? (highContrast ? '#000' : NAVY) : GREEN,
                        },
                      ]}
                    >
                      {cell}
                    </Text>
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        {/* ── Number pad — single row ── */}
        <View style={[styles.numPad, { width: BOARD_SIZE }]}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Pressable
              key={n}
              style={[styles.numBtn, { width: NUM_BTN_SIZE, height: NUM_BTN_SIZE }]}
              onPress={() => handleNumberPress(n)}
              accessibilityRole="button"
              accessibilityLabel={`Número ${n}`}
            >
              <Text style={[styles.numBtnText, { fontSize: fs(22) }]}>{n}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Action row ── */}
        <View style={[styles.actionRow, { width: BOARD_SIZE }]}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#78909C' }]}
            onPress={() => handleNumberPress(null)}
            accessibilityRole="button"
            accessibilityLabel="Borrar celda"
          >
            <Text style={[styles.actionBtnText, { fontSize: fs(17) }]}>🗑 Borrar</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: NAVY }]}
            onPress={newGame}
            accessibilityRole="button"
            accessibilityLabel="Nuevo juego"
          >
            <Text style={[styles.actionBtnText, { fontSize: fs(17) }]}>🔄 Nuevo</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* ── Win modal ── */}
      <Modal visible={showWin} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalIcon}>🎉</Text>
            <Text style={[styles.modalTitle, { fontSize: fs(28) }]}>¡Felicidades!</Text>
            <Text style={[styles.modalBody, { fontSize: fs(18) }]}>Completaste el sudoku.</Text>
            <Pressable
              style={styles.modalBtn}
              onPress={newGame}
              accessibilityRole="button"
              accessibilityLabel="Jugar de nuevo"
            >
              <Text style={[styles.modalBtnText, { fontSize: fs(20) }]}>Jugar de nuevo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,         // sin espacio extra — el header de Expo se elimina en _layout
    paddingBottom: 12,
    backgroundColor: NAVY,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
  },
  title: {
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 4,
    overflow: 'hidden',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'solid',
  },
  cellTextGiven: {
    fontFamily: 'Montserrat_700Bold',
  },
  cellTextPlayer: {
    fontFamily: 'Montserrat_400Regular',
  },
  numPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  numBtn: {
    borderRadius: 12,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  numBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
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
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 16,
  },
  modalIcon: {
    fontSize: 52,
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
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    marginTop: 8,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
  },
});