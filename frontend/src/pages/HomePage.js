import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App";
import api from "../lib/api";
import { haptic } from "../lib/telegram";

export default function HomePage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [bet, setBet] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startGame(gameMode) {
    setLoading(true); setError("");
    try {
      const betAmount = gameMode === "bet" ? bet : 0;
      const res = await api.createGame(user.id, betAmount, gameMode);
      haptic.impact("medium");
      navigate(`/game/${res.code}`);
    } catch (e) { setError(e.message); haptic.notification("error"); }
    finally { setLoading(false); }
  }

  async function joinGame() {
    if (!joinCode.trim()) return;
    setLoading(true); setError("");
    try {
      await api.joinGame(user.id, joinCode.trim().toUpperCase());
      haptic.impact("medium");
      navigate(`/game/${joinCode.trim().toUpperCase()}`);
    } catch (e) { setError(e.message); haptic.notification("error"); }
    finally { setLoading(false); }
  }

  const total = user.wins + user.losses + user.draws;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d14", paddingBottom: 88 }}>
      <div style={{
        background: "linear-gradient(135deg, #1a1040 0%, #0d1a2e 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "24px 20px 20px", position: "relative", overflow: "hidden", marginBottom: 12
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", pointerEvents: "none" }}/>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>ПРИВЕТ, {user.first_name.toUpperCase()} 👋</div>
        <div style={{ fontFamily: "Nunito", fontSize: 32, fontWeight: 900, lineHeight: 1.1, marginBottom: 16 }}>
          Время<br/><span style={{ color: "#f59e0b" }}>побеждать.</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>🏆</span>
            <span style={{ fontWeight: 800, fontSize: 15 }}>{user.wins}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>побед</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>💔</span>
            <span style={{ fontWeight: 800, fontSize: 15 }}>{user.losses}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>пораж.</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: "6px 14px" }}>
            <span style={{ fontSize: 16 }}>🪙</span>
            <span style={{ fontWeight: 900, fontSize: 16, color: "#f59e0b" }}>{user.coins}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ marginBottom: 16, padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>{user.rank.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{user.rank.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{total} игр · {total > 0 ? Math.round(user.wins/total*100) : 0}% побед</div>
          </div>
        </div>

        {!mode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "🤖", label: "Играть с ботом", sub: "Тренировка против ИИ", color: "99,102,241", action: () => startGame("bot") },
              { icon: "👥", label: "Играть с другом", sub: "Пригласи друга по коду", color: "168,85,247", action: () => setMode("friend") },
              { icon: "💰", label: "Игра на ставки", sub: "Победитель забирает банк", color: "245,158,11", action: () => setMode("bet") },
            ].map((b, i) => (
              <button key={i} onClick={() => { haptic.selection(); b.action(); }} disabled={loading}
                style={{
                  width: "100%", padding: "18px 20px", border: `1px solid rgba(${b.color},0.3)`, borderRadius: 20, cursor: "pointer",
                  background: `rgba(${b.color},0.08)`, display: "flex", alignItems: "center", gap: 16, textAlign: "left", transition: "all 0.15s"
                }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `rgba(${b.color},0.2)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{b.icon}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, fontFamily: "Nunito" }}>{b.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 }}>{b.sub}</div>
                </div>
              </button>
            ))}
            <button onClick={() => { haptic.selection(); setMode("join"); }}
              style={{ width: "100%", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, cursor: "pointer", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔗</div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "Nunito" }}>Войти по коду</div>
            </button>
          </div>
        )}

        {mode === "friend" && (
          <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>👥 Создай игру и отправь код другу</div>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => startGame("friend")} disabled={loading}>{loading ? "Создаём..." : "🎮 Создать игру"}</button>
            <button className="btn btn-secondary btn-block" onClick={() => setMode(null)}>← Назад</button>
          </div>
        )}

        {mode === "bet" && (
          <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18 }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>СТАВКА · баланс: 🪙{user.coins}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
                {[10, 25, 50, 100, 200, 500].map(v => (
                  <button key={v} onClick={() => { haptic.selection(); setBet(v); }} disabled={v > user.coins}
                    style={{ padding: "10px 0", border: `1.5px solid ${bet === v ? "#f59e0b" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, cursor: v > user.coins ? "not-allowed" : "pointer", background: bet === v ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)", color: bet === v ? "#f59e0b" : "rgba(255,255,255,0.7)", fontWeight: 800, fontSize: 14, opacity: v > user.coins ? 0.4 : 1 }}>🪙{v}</button>
                ))}
              </div>
              <input className="input" type="number" placeholder="Своя сумма" value={bet || ""} min={0} max={user.coins} onChange={e => setBet(Math.min(Number(e.target.value), user.coins))} />
            </div>
            <button className="btn btn-gold btn-lg btn-block" onClick={() => startGame("bet")} disabled={loading || bet <= 0}>{loading ? "Создаём..." : `💰 Играть на ${bet} монет`}</button>
            <button className="btn btn-secondary btn-block" onClick={() => setMode(null)}>← Назад</button>
          </div>
        )}

        {mode === "join" && (
          <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Введи код игры</div>
              <input className="input" placeholder="XXXXXX" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} style={{ textAlign: "center", letterSpacing: 8, fontSize: 28, fontWeight: 900 }} />
            </div>
            <button className="btn btn-primary btn-lg btn-block" onClick={joinGame} disabled={loading || joinCode.length < 6}>{loading ? "Входим..." : "🔗 Войти в игру"}</button>
            <button className="btn btn-secondary btn-block" onClick={() => setMode(null)}>← Назад</button>
          </div>
        )}

        {error && <div style={{ marginTop: 12, padding: 12, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 14, color: "#f43f5e", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{error}</div>}
      </div>
    </div>
  );
}
