const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const Game = require('../models/Game');
const User = require('../models/User'); 

/**
 * Helpers for 3x3 mod-3 Lights-out style:
 */
const cloneGrid = (g) => g.map((row) => row.slice());

const applyToggleOnce = (grid, r, c) => {
  const R = 3, C = 3;
  const inc = (rr, cc) => {
    if (rr >= 0 && rr < R && cc >= 0 && cc < C) {
      grid[rr][cc] = (grid[rr][cc] + 1) % 3;
    }
  };
  inc(r, c);
  inc(r - 1, c);
  inc(r + 1, c);
  inc(r, c - 1);
  inc(r, c + 1);
};

const applyToggles = (grid, toggleCounts) => {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const times = ((toggleCounts[r][c] % 3) + 3) % 3;
      for (let t = 0; t < times; t++) {
        applyToggleOnce(grid, r, c);
      }
    }
  }
};

/**
 * generatePuzzle()
 * - builds a puzzle by applying random toggles to zero grid (so it's solvable)
 * - returns object with initialGrid, solutionToggles, generateToggles
 */
const generatePuzzle = () => {
  const zeroGrid = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  // random toggles used to create puzzle
  const generateToggles = Array.from({ length: 3 }, () => Array(3).fill(0));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      generateToggles[r][c] = Math.floor(Math.random() * 3); // 0,1,2
    }
  }

  // apply generateToggles to zeroGrid to make puzzle
  const initialGrid = cloneGrid(zeroGrid);
  applyToggles(initialGrid, generateToggles);

  // solution toggles: what's needed to undo generateToggles (i.e. -generateToggles mod 3)
  const solutionToggles = Array.from({ length: 3 }, () => Array(3).fill(0));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      solutionToggles[r][c] = (3 - (generateToggles[r][c] % 3)) % 3;
    }
  }

  // verify applying solutionToggles to initialGrid yields all zeros
  const checkGrid = cloneGrid(initialGrid);
  applyToggles(checkGrid, solutionToggles);
  const allZero = checkGrid.every(row => row.every(cell => cell === 0));
  if (!allZero) {
    // extremely unlikely, but guard: regenerate
    return generatePuzzle();
  }

  return {
    initialGrid,
    solutionToggles,
    generateToggles
  };
};

// GET /api/generate-game
router.get('/generate-game', async (req, res) => {
  try {
    const { initialGrid, solutionToggles, generateToggles } = generatePuzzle();
    const gameId = typeof randomUUID === 'function'
      ? randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

    const gameDoc = new Game({
      gameId,
      initialGrid,
      solutionToggles,
      generateToggles,
      createdAt: Date.now()
    });

    await gameDoc.save();

    return res.json({ gameId, grid: initialGrid });
  } catch (err) {
    console.error('Error generating game:', err);
    return res.status(500).json({ error: 'Failed to generate game' });
  }
});

/**
 * POST /api/validate-game
 * Body:
 *  - gameId (required)
 *  - moves (required) — array of { r, c } entries
 *  - grid (optional) — if provided, must match the result of applying moves
 *  - email (optional, used to credit points on existing User)
 *
 * Server computes the final grid by replaying "moves" on the saved initialGrid.
 * If solved (all zeros): awards points to existing User (if email provided and user exists),
 * then generates and returns a new puzzle in the response.
 */
const POINTS_PER_WIN = 75;

router.post('/validate-game', async (req, res) => {
  try {
    const { gameId, grid, moves, email } = req.body;
    if (!gameId) {
      return res.status(400).json({ validGame: false, solved: false, message: 'Missing gameId' });
    }

    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ validGame: false, solved: false, message: 'Game not found or expired' });
    }

    // determine finalGrid by replaying moves on the server from initialGrid (authoritative)
    if (!Array.isArray(moves)) {
      return res.status(400).json({ validGame: false, solved: false, message: 'Provide moves as an array of {r,c}' });
    }

    let finalGrid = cloneGrid(game.initialGrid);
    for (const mv of moves) {
      if (typeof mv !== 'object' || typeof mv.r !== 'number' || typeof mv.c !== 'number') {
        return res.status(400).json({ validGame: false, solved: false, message: 'Invalid move format' });
      }
      applyToggleOnce(finalGrid, mv.r, mv.c);
    }

    // If client provided grid, cross-check it matches the server-replayed result
    if (Array.isArray(grid)) {
      if (grid.length !== 3 || grid.some(r => !Array.isArray(r) || r.length !== 3)) {
        return res.status(400).json({ validGame: false, solved: false, message: 'Invalid grid format' });
      }
      const clientGrid = grid.map(row => row.map(cell => ((Number(cell) % 3) + 3) % 3));
      const mismatch = clientGrid.some((row, r) => row.some((cell, c) => cell !== (((Number(finalGrid[r][c]) % 3) + 3) % 3)));
      if (mismatch) {
        return res.status(400).json({ validGame: false, solved: false, message: 'Grid does not match provided moves' });
      }
    }

    // normalize & validate cell values
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        finalGrid[r][c] = ((Number(finalGrid[r][c]) % 3) + 3) % 3;
        if (![0,1,2].includes(finalGrid[r][c])) {
          return res.status(400).json({ validGame: false, solved: false, message: 'Invalid cell values' });
        }
      }
    }

    const solved = finalGrid.every(row => row.every(cell => cell === 0));
    if (!solved) {
      return res.json({ validGame: true, solved: false, message: 'Grid is not all zeros' });
    }

    // solved -> award points if email provided and user exists
    let awardedPoints = 0;
    let newTotalPoints = null;
    if (email && typeof email === 'string' && email.trim()) {
      // increment existing user's points; do NOT auto-create user
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $inc: { points: POINTS_PER_WIN } },
        { new: true }
      );
      if (updatedUser) {
        awardedPoints = POINTS_PER_WIN;
        newTotalPoints = updatedUser.points;
      } else {
        // user not found — no points awarded
        awardedPoints = 0;
      }
    }
    await Game.deleteOne({ gameId });
    // generate new puzzle to return to client
    const { initialGrid: newGrid, solutionToggles: newSol, generateToggles: newGen } = generatePuzzle();
    const newGameId = typeof randomUUID === 'function'
      ? randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

    const newGameDoc = new Game({
      gameId: newGameId,
      initialGrid: newGrid,
      solutionToggles: newSol,
      generateToggles: newGen,
      createdAt: Date.now()
    });
    await newGameDoc.save();

    return res.json({
      validGame: true,
      solved: true,
      message: awardedPoints > 0 ? `Solved! ${awardedPoints} points awarded.` : 'Solved!',
      awardedPoints,
      newTotalPoints,
      newGame: { gameId: newGameId, grid: newGrid }
    });

  } catch (err) {
    console.error('Error validating game:', err);
    return res.status(500).json({ validGame: false, solved: false, message: 'Server error' });
  }
});

module.exports = router;
