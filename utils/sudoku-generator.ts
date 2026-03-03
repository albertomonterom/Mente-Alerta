// ─── Types ────────────────────────────────────────────────────────────────────

export type Board = (number | null)[][];

export interface SudokuPuzzle {
  /** The puzzle the player sees — nulls are empty cells */
  puzzle: Board;
  /** The full solution */
  solution: Board;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deep clone a 9x9 board */
function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

/** Shuffle an array in place (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Check if placing `num` at (row, col) is valid */
export function isValidPlacement(board: Board, row: number, col: number, num: number): boolean {
  // Check row
  if (board[row].includes(num)) return false;

  // Check column
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }

  return true;
}

// ─── Board generation (backtracking) ─────────────────────────────────────────

function fillBoard(board: Board): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num;
            if (fillBoard(board)) return true;
            board[row][col] = null;
          }
        }
        return false; // backtrack
      }
    }
  }
  return true; // all cells filled
}

// ─── Remove cells to create puzzle ───────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

const CELLS_TO_REMOVE: Record<Difficulty, number> = {
  easy: 30,
  medium: 40,
  hard: 50,
};

function removeCells(solution: Board, difficulty: Difficulty): Board {
  const puzzle = cloneBoard(solution);
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  let removed = 0;
  const target = CELLS_TO_REMOVE[difficulty];

  for (const [row, col] of positions) {
    if (removed >= target) break;
    puzzle[row][col] = null;
    removed++;
  }

  return puzzle;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Generate a new sudoku puzzle with its solution */
export function generateSudoku(difficulty: Difficulty = 'medium'): SudokuPuzzle {
  const emptyBoard: Board = Array.from({ length: 9 }, () => Array(9).fill(null));
  fillBoard(emptyBoard);
  const solution = cloneBoard(emptyBoard);
  const puzzle = removeCells(emptyBoard, difficulty);
  return { puzzle, solution };
}

/** Check if the player's current board matches the solution */
export function isBoardComplete(current: Board, solution: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (current[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

/** Returns true if a player-entered value conflicts with existing values */
export function hasConflict(board: Board, row: number, col: number, num: number): boolean {
  // Temporarily remove the cell to check against others
  const temp = board[row][col];
  const testBoard = cloneBoard(board);
  testBoard[row][col] = null;
  const valid = isValidPlacement(testBoard, row, col, num);
  return !valid;
}