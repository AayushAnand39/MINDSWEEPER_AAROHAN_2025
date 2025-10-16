import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import "./dashboard.css";

const games = [
  {
    id: "game1",
    title: "Grid Tap Puzzle",
    gameNumber: "GAME 1",
    subtitle: "Quantum Grid",
    path: "/game1",
    image: "/assets/game1bg.png",
    icon: "🎯",
    color: "cyan",
    difficulty: "Hard",
    points: 75,
    description: "Transform a 3×3 grid of numbers into all zeros through strategic tapping.",
  },
  {
    id: "game2",
    title: "Constellation Puzzle",
    gameNumber: "GAME 2",
    subtitle: "Neural Tree",
    path: "/game2",
    image: "/assets/game2bg.png",
    icon: "⭐",
    color: "purple",
    difficulty: "Medium",
    points: 15,
    description: "Arrange numbers on a tree structure to create unique edge weights.",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setIsAuthenticated(!!token);
  }, []);

  const handlePlay = (path) => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      navigate(path);
    }
  };

  const bottomSpacerHeight = 260;
  const NAVBAR_HEIGHT = 88;
  const topPadding = NAVBAR_HEIGHT + 40;
  const horizontalPadding = 16;

  return (
    <div
      className="dashboard-container"
      style={{
        minHeight: "120vh",
        paddingTop: `${topPadding}px`,
        paddingInline: `${horizontalPadding}px`,
        boxSizing: "border-box",
      }}
    >
      {/* Animated Background */}
      <div className="dashboard-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* Floating Particles */}
      <div className="particles-container" aria-hidden="true">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>

      <main className="dashboard-main">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="title-wrapper">
            <div className="title-decoration"></div>
            <h1 className="dashboard-title">
              <span className="title-line">Choose Your</span>
              <span className="title-line highlight">Challenge</span>
            </h1>
            <p className="dashboard-subtitle">
              Test your skills in mind-bending puzzles
            </p>
          </div>

          {/* Rules Button */}
          <button
            onClick={() => navigate("/rules")}
            className="rules-button"
            aria-label="View game rules"
          >
            <span className="button-bg"></span>
            <span className="button-border"></span>
            <span className="button-content">
              <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              View Rules
            </span>
          </button>
        </div>

        {/* Game Cards */}
        <div className="games-grid">
          {games.map((game, index) => (
            <article
              key={game.id}
              className={`game-card game-${game.color} ${hoveredCard === game.id ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredCard(game.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Card Border Effect */}
              <div className="card-border-effect"></div>

              {/* Card Header */}
              <div className="card-header">
                <div className="card-header-left">
                  <div className="game-icon-wrapper">
                    <span className="game-icon">{game.icon}</span>
                    <div className="icon-glow"></div>
                  </div>

                  <div className="game-header-info">
                    <div className="game-meta">
                      <span className="game-number-badge">{game.gameNumber}</span>
                      <span className="difficulty-badge">{game.difficulty}</span>
                    </div>
                    <h2 className="card-title">{game.title}</h2>
                    <p className="card-subtitle">{game.subtitle}</p>
                  </div>
                </div>

                <div className="card-header-right">
                  <div className="points-display">
                    <svg className="points-star-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className="points-value">{game.points}</span>
                  </div>
                </div>
              </div>

              {/* Card Description */}
              <div className="card-description">
                <p>{game.description}</p>
              </div>

              {/* Play Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(game.path);
                }}
                className="play-button"
                aria-label={`Play ${game.title}`}
              >
                <span className="play-button-bg"></span>
                <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span className="play-text">
                  {isAuthenticated ? "Play Now" : "Login to Play"}
                </span>
                <svg className="button-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              {/* Shine Effect */}
              <div className="card-shine"></div>
            </article>
          ))}
        </div>

        {/* Stats Section */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{games.length}</div>
              <div className="stat-label">Active Games</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{games.reduce((acc, g) => acc + g.points, 0)}</div>
              <div className="stat-label">Total Points</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">∞</div>
              <div className="stat-label">Possibilities</div>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ height: bottomSpacerHeight }} />
      </main>
    </div>
  );
};

export default Dashboard;