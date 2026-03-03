import React, { createContext, useContext, useState } from 'react';
import { Board, generateSudoku, } from '@/utils/sudoku-generator';

interface SudokuContextValue {
  playerBoard: Board;
  solution: Board;
  given: boolean[][];
  setPlayerBoard: (b: Board) => void;
  newGame: () => void;
}

const SudokuContext = createContext<SudokuContextValue | null>(null);

export function SudokuProvider({ children }: { children: React.ReactNode }) {
  const init = generateSudoku('medium');

  const [playerBoard, setPlayerBoard] = useState<Board>(init.puzzle);
  const [solution, setSolution]       = useState<Board>(init.solution);
  const [given, setGiven]             = useState<boolean[][]>(
    init.puzzle.map((row) => row.map((cell) => cell !== null))
  );

  const newGame = () => {
    const { puzzle, solution: s } = generateSudoku('medium');
    setPlayerBoard(puzzle.map((row) => [...row]));
    setSolution(s);
    setGiven(puzzle.map((row) => row.map((cell) => cell !== null)));
  };

  return (
    <SudokuContext.Provider value={{ playerBoard, solution, given, setPlayerBoard, newGame }}>
      {children}
    </SudokuContext.Provider>
  );
}

export function useSudoku() {
  const ctx = useContext(SudokuContext);
  if (!ctx) throw new Error('useSudoku must be used inside SudokuProvider');
  return ctx;
}