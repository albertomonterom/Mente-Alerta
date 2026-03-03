// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlacedWord {
  word: string;
  cells: string[]; // "row-col"
}

export interface WordSearchResult {
  grid: string[][];
  placedWords: PlacedWord[];
}

/** Row-delta and col-delta for each supported direction. */
const DIRECTIONS = [
  { dr:  0, dc:  1 }, // horizontal →
  { dr:  1, dc:  0 }, // vertical ↓
  { dr:  1, dc:  1 }, // diagonal ↘
  { dr: -1, dc:  1 }, // diagonal ↗
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a size×size grid filled with empty strings. */
function createEmptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill(''));
}

/** Pick up to `count` unique words at random from the provided list. */
function pickRandomWords(words: string[], count: number): string[] {
  const pool = [...words];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0].toUpperCase());
  }
  return picked;
}

/**
 * Returns true if `word` can be placed at (startRow, startCol)
 * going in direction (dr, dc) without overflow or conflicting letters.
 */
function canPlaceWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  dr: number,
  dc: number,
): boolean {
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const r = startRow + dr * i;
    const c = startCol + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
  }
  return true;
}

/**
 * Mutates the grid by writing `word` starting at (startRow, startCol)
 * in direction (dr, dc).  Returns the list of "row-col" cell keys.
 */
function placeWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  dr: number,
  dc: number,
): string[] {
  const cells: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const r = startRow + dr * i;
    const c = startCol + dc * i;
    grid[r][c] = word[i];
    cells.push(`${r}-${c}`);
  }
  return cells;
}

/** Fill every empty cell in the grid with a random uppercase letter. */
function fillEmptyCells(grid: string[][]): void {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHA[Math.floor(Math.random() * ALPHA.length)];
      }
    }
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generates a word-search puzzle.
 *
 * @param size  - Grid dimension (size × size).
 * @param words - Pool of candidate words to use.
 * @returns     - Filled grid and metadata for each successfully placed word.
 */
export function generateWordSearch(
  size: number,
  words: string[],
): WordSearchResult {
  const MAX_WORDS    = 6;
  const MAX_ATTEMPTS = 100;

  const grid        = createEmptyGrid(size);
  const selected    = pickRandomWords(words, MAX_WORDS);
  const placedWords: PlacedWord[] = [];

  for (const word of selected) {
    let placed = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const dir       = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const startRow  = Math.floor(Math.random() * size);
      const startCol  = Math.floor(Math.random() * size);

      if (canPlaceWord(grid, word, startRow, startCol, dir.dr, dir.dc)) {
        const cells = placeWord(grid, word, startRow, startCol, dir.dr, dir.dc);
        placedWords.push({ word, cells });
        placed = true;
        break;
      }
    }

    // If the word couldn't be placed in MAX_ATTEMPTS, skip it silently.
    if (!placed) {
      console.warn(`[WordSearch] Could not place word: "${word}" — skipped.`);
    }
  }

  fillEmptyCells(grid);

  return { grid, placedWords };
}
