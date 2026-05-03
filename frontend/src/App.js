import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import api from "./lib/api";
import { initTelegram, getInitData, haptic } from "./lib/telegram";

// ─── Context ───
const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// ─── Pages ───
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import ProfilePage from "./pages/ProfilePage";
import ShopPage from "./pages/ShopPage";
import TopUpPage from "./pages/TopUpPage";
import LeaderboardPage from "./pages/LeaderboardPage";

// ─── Bottom Nav ───
function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const isGame = path.startsWith("/game");

  if (isGame) return null;

  const items = [
    { path: "/", icon: HomeIcon, label: "Игра" },
    { path: "/leaderboard", icon: TrophyIcon, label: "Топ" },
    { path: "/shop", icon: ShopIcon, label: "Магазин" },
    { path: "/profile", icon: UserIcon, label: "Профиль" },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.path}
          className={`nav-item ${path === item.path ? "active" : ""}`}
          onClick={() => { haptic.selection(); navigate(item.path); }}
        >
          <item.icon />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Icons ───
function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>;
}
function TrophyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8,21 12,21 16,21"/><line x1="12" y1="17" x2="12" y2="21"/>
    <path d="M7,4H17L19,8C19,11.3137 15.866,14 12,14C8.13401,14 5,11.3137 5,8L7,4Z"/>
    <path d="M5,8H3C3,11 5,13 7,13"/><path d="M19,8H21C21,11 19,13 17,13"/>
  </svg>;
}
function ShopIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>;
}

// ─── Main App ───
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initTelegram();
    login();
  }, []);

  async function login() {
    try {
      const initData = getInitData();
      let result;
      if (initData) {
        result = await api.auth(initData, null, null);
      } else {
        // Dev mode
        result = await api.auth(null, 123456789, "dev_user");
      }
      setUser(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="loader" style={{ minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text2)", fontFamily: "Unbounded", fontSize: 13 }}>XO GAME</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="loader" style={{ minHeight: "100vh", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 48 }}>😵</div>
      <p style={{ color: "var(--red)", fontWeight: 600 }}>{error}</p>
      <button className="btn btn-primary" onClick={() => { setError(null); setLoading(true); login(); }}>
        Повторить
      </button>
    </div>
  );

  return (
    <AppContext.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:code" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/topup" element={<TopUpPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
