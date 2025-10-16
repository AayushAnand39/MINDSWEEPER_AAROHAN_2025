import React, { useState, useEffect } from "react";
import { Button, Typography, Box, Paper } from "@mui/material";
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
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState([]);
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
    setHistory(prev => {
      const next = [...prev];
      next.push(cloneGrid(grid));
      if (next.length > 100) next.shift();
      return next;
    });

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
      const resp = await axios.post(`${import.meta.env.VITE_BACKEND_BASE}/api/validate-game`, {
        gameId,
        grid: solvedGrid,
        moves,
        email
      }, { timeout: 8000 });

      if (resp.data && resp.data.validGame && resp.data.solved) {
        setMessage(resp.data.message || "Solved! Points awarded.");
        if (resp.data.awardedPoints) {
          setAwardedPoints(resp.data.awardedPoints);
        }
        if (resp.data.newGame && resp.data.newGame.grid) {
          setTimeout(() => {
            setGrid(resp.data.newGame.grid);
            setGameId(resp.data.newGame.gameId || null);
            setHistory([]);
            setMoves([]);
            setMessage("New puzzle loaded. Good luck!");
            setAwardedPoints(0);
          }, 1100);
        } else {
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

  const manualCheck = async () => {
    if (!grid) return;
    if (isAllZeros(grid)) {
      await onSolved(grid);
    } else {
      setMessage("Not solved yet.");
    }
  };

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)), url(${BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 300, letterSpacing: 1 }}>
          Loading puzzle...
        </Typography>
      </Box>
    );
  }

  if (!grid) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)), url(${BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <Typography color="error">No puzzle loaded. {message}</Typography>
      </Box>
    );
  }

  const cellStyles = {
    0: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
      shadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
      hoverShadow: '0 12px 32px rgba(102, 126, 234, 0.5)'
    },
    1: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#fff',
      shadow: '0 8px 24px rgba(240, 147, 251, 0.4)',
      hoverShadow: '0 12px 32px rgba(240, 147, 251, 0.5)'
    },
    2: {
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#fff',
      shadow: '0 8px 24px rgba(79, 172, 254, 0.4)',
      hoverShadow: '0 12px 32px rgba(79, 172, 254, 0.5)'
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 3,
      backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%), url(${BACKGROUND_IMAGE})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <Paper 
        elevation={0}
        sx={{ 
          maxWidth: 480,
          width: '100%',
          p: 4,
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 32px 64px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 2
            }}
          >
            Light Grid
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: 1.6,
              px: 2
            }}
          >
            Click cells to cycle through states (0 → 1 → 2 → 0).
            <br />
            Neighbors change too. Make all zeros to win!
          </Typography>
        </Box>

        {/* Grid */}
        <Box sx={{ 
          display: 'grid', 
          gap: 1.5, 
          gridTemplateColumns: 'repeat(3, 1fr)',
          mb: 3,
          p: 2,
          borderRadius: 3,
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const style = cellStyles[cell];
              return (
                <Button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  sx={{
                    aspectRatio: '1',
                    minWidth: 0,
                    minHeight: 0,
                    borderRadius: 2.5,
                    fontSize: 28,
                    fontWeight: 700,
                    boxShadow: style.shadow,
                    background: style.background,
                    color: style.color,
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px) scale(1.02)',
                      boxShadow: style.hoverShadow
                    },
                    '&:active': { 
                      transform: 'translateY(-1px) scale(0.98)',
                      transition: 'all 100ms'
                    }
                  }}
                >
                  {cell}
                </Button>
              );
            })
          )}
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          <Button 
            variant="outlined" 
            onClick={undo} 
            disabled={!history.length}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontWeight: 600,
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.05)'
              },
              '&:disabled': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            Undo
          </Button>
          <Button 
            variant="outlined" 
            onClick={manualCheck} 
            disabled={verifying}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontWeight: 600,
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            Check
          </Button>
          <Button 
            variant="contained" 
            onClick={fetchGame}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c8ff0 0%, #8556b0 100%)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)'
              }
            }}
          >
            New
          </Button>
        </Box>

        {/* Stats */}
        <Box sx={{ 
          p: 2.5,
          borderRadius: 2.5,
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
              MOVES
            </Typography>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              {moves.length}
            </Typography>
          </Box>
          
          {(message || verifying) && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: awardedPoints > 0 ? '#4ade80' : 'rgba(255, 255, 255, 0.8)',
                textAlign: 'center',
                py: 1,
                px: 2,
                borderRadius: 1.5,
                background: awardedPoints > 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                fontWeight: 500
              }}
            >
              {verifying ? 'Verifying...' : message}
            </Typography>
          )}
          
          {awardedPoints > 0 && (
            <Box sx={{ 
              mt: 2,
              p: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(34, 197, 94, 0.2) 100%)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              textAlign: 'center'
            }}>
              <Typography variant="h5" sx={{ color: '#4ade80', fontWeight: 700 }}>
                🎉 +{awardedPoints} Points!
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default LightGridGame;