import React, { useState, useEffect } from "react";
import { Button, Typography, Grid, Box, Paper } from "@mui/material";
import axios from "axios";
import bg from "../../../public/assets/game1main.jpg"


const BACKGROUND_IMAGE = bg;

const cloneGrid = (g) => g.map((row) => row.slice());
const isAllZeros = (grid) => grid.every(row => row.every(cell => Number(cell) === 0));

const applyClick = (grid, r, c) => {
  const R = 3, C = 3;
  const g = cloneGrid(grid);
  const inc = (rr, cc) => {
    if (rr >= 0 && rr < R && cc >= 0 && cc < C) {
      g[rr][cc] = (g[rr][cc] + 1) % 3;
    }
  };
  inc(r, c);
  inc(r - 1, c);
  inc(r + 1, c);
  inc(r, c - 1);
  inc(r, c + 1);
  return g;
};

const LightGridGame = () => {
  const [grid, setGrid] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]); // stack of previous grids for undo
  const [moves, setMoves] = useState([]); // move sequence {r,c}
  const [awardedPoints, setAwardedPoints] = useState(0);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGame = async () => {
    setLoading(true);
    setMessage("");
    setHistory([]);
    setMoves([]);
    setAwardedPoints(0);
    try {
      const resp = await axios.get(`${import.meta.env.VITE_BACKEND_BASE}/api/generate-game`, { timeout: 6000 });
      if (resp.data && resp.data.grid) {
        setGrid(resp.data.grid);
        setGameId(resp.data.gameId || null);
      } else {
        setMessage("Unexpected response from server.");
      }
    } catch (err) {
      console.error("Fetch game error:", err);
      if (err.response) setMessage(`Server error: ${err.response.status}`);
      else if (err.request) setMessage(`No response from backend at ${import.meta.env.VITE_BACKEND_BASE}`);
      else setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (r, c) => {
    if (!grid) return;
    // push current grid into history (deep copy)
    setHistory(prev => {
      const next = [...prev];
      next.push(cloneGrid(grid));
      // keep history length reasonable
      if (next.length > 100) next.shift();
      return next;
    });

    // add move to moves list
    setMoves(prev => [...prev, { r, c }] );

    const newGrid = applyClick(grid, r, c);
    setGrid(newGrid);

    // if (isAllZeros(newGrid)) {
    //   onSolved(newGrid);
    // }
  };

  const undo = () => {
    setMessage("");
    setAwardedPoints(0);
    setMoves(prev => {
      // also remove last move
      const p = [...prev];
      if (p.length) p.pop();
      return p;
    });
    setHistory(prev => {
      const p = [...prev];
      if (!p.length) return p;
      const last = p.pop();
      setGrid(last);
      return p;
    });
  };

  const onSolved = async (solvedGrid) => {
    setMessage("You reached all zeros — verifying with server...");
    setVerifying(true);
    setAwardedPoints(0);
    try {
      const email = localStorage.getItem('email') || undefined;
      // send moves for stronger server-side verification
      const resp = await axios.post(`${import.meta.env.VITE_BACKEND_BASE}/api/validate-game`, {
        gameId,
        grid: solvedGrid, // could send moves instead: moves
        moves,             // we send moves as well for server replay verification
        email
      }, { timeout: 8000 });

      if (resp.data && resp.data.validGame && resp.data.solved) {
        setMessage(resp.data.message || "Solved! Points awarded.");
        if (resp.data.awardedPoints) {
          setAwardedPoints(resp.data.awardedPoints);
        }
        // If server returned newGame, load it automatically
        if (resp.data.newGame && resp.data.newGame.grid) {
          // small delay so user sees success before new puzzle
          setTimeout(() => {
            setGrid(resp.data.newGame.grid);
            setGameId(resp.data.newGame.gameId || null);
            setHistory([]);
            setMoves([]);
            setMessage("New puzzle loaded. Good luck!");
            setAwardedPoints(0);
          }, 1100);
        } else {
          // if no newGame, just fetch a new one
          setTimeout(fetchGame, 1200);
        }
      } else if (resp.data && resp.data.validGame && !resp.data.solved) {
        setMessage("Server says not solved (unexpected).");
      } else {
        setMessage(resp.data?.message || "Server rejected the solution.");
      }
    } catch (err) {
      console.error("Validation error:", err);
      if (err.response) setMessage(`Validation server error: ${err.response.status}`);
      else if (err.request) setMessage(`No response from backend when validating`);
      else setMessage(err.message);
    } finally {
      setVerifying(false);
    }
  };

  // manual check (button)
  const manualCheck = async () => {
    if (!grid) return;
    if (isAllZeros(grid)) {
      await onSolved(grid);
    } else {
      setMessage("Not solved yet.");
    }
  };

  if (loading) return <Typography>Loading puzzle…</Typography>;
  if (!grid) return <Typography color="error">No puzzle loaded. {message}</Typography>;

  // UI colors based on cell value
  const cellBg = (val) => val === 0 ? 'linear-gradient(180deg,#e6fffa,#b2f5ea)' : val === 1 ? 'linear-gradient(180deg,#fff7ed,#ffe8cc)' : 'linear-gradient(180deg,#fff1f2,#ffd0d6)';
  const cellShadow = (val) => val === 0 ? '0 6px 12px rgba(0,128,128,0.08)' : val === 1 ? '0 6px 12px rgba(255,140,0,0.08)' : '0 6px 12px rgba(220,20,60,0.08)';

  return (
    // Outer Box provides the background image + subtle overlay so content remains legible
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        // Use a semi-transparent gradient on top of the image for readability
        backgroundImage: `linear-gradient(rgba(35, 34, 34, 0.8), rgba(35, 34, 34, 0.8)), url(${BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <Paper elevation={6} sx={{ display: 'inline-block', p: 3, borderRadius: 3, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(255,255,255,0.84)' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click a cell to increment it and its orthogonal neighbors (0 → 1 → 2 → 0). Make all zeros to win.
        </Typography>

        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(3,72px)', justifyContent: 'center' }}>
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <Button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 2,
                  fontSize: 22,
                  fontWeight: 600,
                  boxShadow: cellShadow(cell),
                  background: cellBg(cell),
                  transition: 'transform 140ms, box-shadow 140ms',
                  '&:active': { transform: 'scale(0.97)' }
                }}
              >
                {cell}
              </Button>
            ))
          )}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={undo} disabled={!history.length}>Undo</Button>
          <Button variant="outlined" onClick={manualCheck} disabled={verifying}>Check</Button>
          <Button variant="contained" color="secondary" onClick={fetchGame}>New Puzzle</Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">Moves: {moves.length}</Typography>
          <Typography variant="body2" color={awardedPoints ? 'success.main' : 'text.primary'} sx={{ mt: 1 }}>
            {verifying ? 'Verifying...' : message}
          </Typography>
          {awardedPoints > 0 && (
            <Typography variant="h6" color="success.main" sx={{ mt: 1 }}>
              🎉 +{awardedPoints} points awarded!
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default LightGridGame;
