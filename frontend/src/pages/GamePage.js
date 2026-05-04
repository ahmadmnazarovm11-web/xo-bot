import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../App";
import { haptic } from "../lib/telegram";
import api from "../lib/api";

const WS_BASE = "wss://xo-bot-backend.onrender.com";

function XSymbol({ size = 40, animated = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none"
      style={{ animation: animated ? "pop 0.4s cubic-bezier(0.34,1.56,0.64,1)" : "none" }}>
      <defs>
        <linearGradient id="xGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b6b"/>
          <stop offset="100%" stopColor="#ee0979"/>
        </linearGradient>
      </defs>
      <line x1="8" y1="8" x2="32" y2="32" stroke="url(#xGrad)" strokeWidth="5" strokeLinecap="round"/>
      <line x1="32" y1="8" x2="8" y2="32" stroke="url(#xGrad)" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  );
}

function OSymbol({ size = 40, animated = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none"
      style={{ animation: animated ? "pop 0.4s cubic-bezier(0.34,1.56,0.64,1)" : "none" }}>
      <circle cx="20" cy="20" r="12" stroke="#ffffff" strokeWidth="5" fill="none"/>
    </svg>
  );
}

function CellContent({ value, skins, isNew }) {
  if (!value) return null;
  const isX = value === skins?.x || value === "X";
  if (isX) return <XSymbol size={44} animated={isNew} />;
  return <OSymbol size={44} animated={isNew} />;
}

export default function GamePage() {
  const { code } = useParams();
  const { user } = useApp();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newCells, setNewCells] = useState({});
  const [restarting, setRestarting] = useState(false);
  const wsRef = useRef(null);
  const pingRef = useRef(null);
  const prevBoard = useRef([]);

  const connect = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/game/${code}/${user.id}`);
    wsRef.current = ws;
    ws.onopen = () => {
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 20000);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "state") {
        const newGame = msg.game;
        const changed = {};
        newGame.board.forEach((cell, i) => {
          if (cell && !prevBoard.current[i]) changed[i] = true;
        });
        setNewCells(changed);
        prevBoard.current = [...newGame.board];
        setTimeout(() => setNewCells({}), 500);
        setGame(newGame);
      }
    };
    ws.onclose = () => { clearInterval(pingRef.current); };
    ws.onerror = () => ws.close();
  }, [code, user.id]);

  useEffect(() => {
    connect();
    return () => { clearInterval(pingRef.current); wsRef.current?.close(); };
  }, [connect]);

  function makeMove(index) {
    if (!game || game.status !== "playing" || game.turn !== user.id || game.board[index]) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    haptic.impact("light");
    wsRef.current.send(JSON.stringify({ type: "move", index }));
}
  function copyCode() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    haptic.notification("success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function newGame() {
    setRestarting(true);
    try {
      const res = await api.createGame(user.id, game.bet, game.mode);
      haptic.impact("medium");
      wsRef.current?.close();
      navigate(`/game/${res.code}`);
    } catch(e) {
      navigate("/");
    } finally {
      setRestarting(false);
    }
  }

  if (!game) return (
    <div className="loader" style={{ minHeight: "100vh", flexDirection: "column", gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: "var(--text2)", fontSize: 13, fontWeight: 700 }}>Подключаемся...</p>
    </div>
  );

  const isMyTurn = game.turn === user.id && game.status === "playing";
  const creator = game.players[0];
  const skins = game.skins[creator.user_id] || { x: "✕", o: "○" };

  const statusText = () => {
    if (game.status === "waiting") return { text: "Ожидаем соперника...", color: "var(--text2)" };
    if (game.status === "finished") {
      if (!game.winner_id) return { text: "🤝 Ничья!", color: "var(--gold2)" };
      if (game.winner_id === user.id) return { text: "🏆 Победа!", color: "var(--green)" };
      if (game.winner_id === "AI_BOT") return { text: "🤖 Бот победил", color: "var(--red)" };
      return { text: "😔 Поражение", color: "var(--red)" };
    }
    if (isMyTurn) return { text: "✨ Твой ход!", color: "var(--accent3)" };
    return { text: "⏳ Ход соперника", color: "var(--text2)" };
  };

  const st = statusText();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: 16, paddingTop: 20, paddingBottom: 24, background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/")}>← Выйти</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>Код игры</div>
          <div style={{ fontFamily: "Nunito", fontSize: 22, fontWeight: 900, letterSpacing: 4 }}>{code}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={copyCode}>{copied ? "✓" : "📋"}</button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 20, fontSize: 18, fontWeight: 900, color: st.color, transition: "all 0.3s" }}>
        {st.text}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {game.players.map((p, i) => {
          const isMe = p.user_id === user.id;
          const isBot = p.user_id === "AI_BOT";
          const isActive = game.turn === p.user_id && game.status === "playing";
          return (
            <div key={i} style={{
              flex: 1, padding: "14px 12px",
              background: isActive ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${isActive ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 18, textAlign: "center", transition: "all 0.3s"
            }}>
              <div style={{ marginBottom: 6, display: "flex", justifyContent: "center" }}>
                {p.symbol === "X" ? <XSymbol size={32} /> : <OSymbol size={32} />}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: isMe ? "var(--accent3)" : "var(--text2)" }}>
                {isBot ? "🤖 Бот" : isMe ? "Ты" : "Соперник"}
              </div>
              {isActive && <div style={{ fontSize: 10, color: "var(--accent2)", marginTop: 3, fontWeight: 700 }}>● ходит</div>}
            </div>
          );
        })}
      </div>

      {game.bet > 0 && (
        <div style={{ textAlign: "center", marginBottom: 16, padding: "10px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, color: "var(--gold2)", fontSize: 13, fontWeight: 800 }}>
          💰 Ставка: {game.bet} · Банк: {game.bet * game.players.length} монет
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, maxWidth: 380, margin: "0 auto", width: "100%", flex: 1, alignContent: "center" }}>
        {game.board.map((cell, i) => {
          const isWin = game.win_line?.includes(i);
          const canClick = !cell && isMyTurn;
          return (
            <button key={i}
              className={`game-cell ${isWin ? "win-cell" : ""} ${canClick ? "clickable" : ""}`}
              onClick={() => makeMove(i)}
              disabled={!canClick}
            >
              <CellContent value={cell} skins={skins} isNew={newCells[i]} />
            </button>
          );
        })}
      </div>

      {game.status === "waiting" && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text2)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Отправь код другу:</p>
          <div style={{ fontFamily: "Nunito", fontSize: 30, letterSpacing: 8, fontWeight: 900, padding: "14px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, display: "inline-block" }}>{code}</div>
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 14 }} onClick={copyCode}>
            {copied ? "✓ Скопировано!" : "📋 Копировать код"}
          </button>
        </div>
      )}

      {game.status === "finished" && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary btn-lg btn-block" onClick={newGame} disabled={restarting}>
            {restarting ? "Создаём игру..." : "🎮 Новая игра"}
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => navigate("/profile")}>
            👤 Профиль
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => navigate("/")}>
            🏠 Главная
          </button>
        </div>
      )}
    </div>
  );
}
