import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App";

export default function ProfilePage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const total = user.wins + user.losses + user.draws;
  const winRate = total > 0 ? Math.round((user.wins / total) * 100) : 0;

  const ranks = [
    { threshold: 0,  name: "Новичок",  icon: "🥚" },
    { threshold: 5,  name: "Боец",     icon: "⚔️" },
    { threshold: 15, name: "Ветеран",  icon: "🛡️" },
    { threshold: 30, name: "Мастер",   icon: "👑" },
    { threshold: 60, name: "Легенда",  icon: "🔥" },
  ];
  const currentRankIdx = ranks.findLastIndex(r => user.wins >= r.threshold);
  const nextRank = ranks[currentRankIdx + 1];
  const progress = nextRank
    ? ((user.wins - ranks[currentRankIdx].threshold) / (nextRank.threshold - ranks[currentRankIdx].threshold)) * 100
    : 100;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d14", paddingBottom: 88 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1040 0%, #0d1a2e 100%)",
        padding: "28px 20px 24px", textAlign: "center",
        borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 16
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg, #f59e0b, #ef4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 900, color: "#fff", margin: "0 auto 14px",
          boxShadow: "0 8px 32px rgba(245,158,11,0.4)"
        }}>
          {user.first_name[0]?.toUpperCase()}
        </div>
        <div style={{ fontFamily: "Nunito", fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{user.first_name}</div>
        {user.username && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>@{user.username}</div>}
        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: "8px 18px" }}>
          <span style={{ fontSize: 20 }}>{user.rank.icon}</span>
          <span style={{ fontFamily: "Nunito", fontWeight: 900, color: "#f59e0b" }}>{user.rank.name}</span>
        </div>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Balance */}
        <div style={{ padding: "18px 20px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>БАЛАНС</div>
            <div style={{ fontFamily: "Nunito", fontSize: 30, fontWeight: 900, color: "#f59e0b" }}>🪙 {user.coins}</div>
          </div>
          <button onClick={() => navigate("/topup")} className="btn btn-gold btn-sm">Пополнить</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            { label: "ПОБЕДЫ", value: user.wins, color: "#10b981", icon: "🏆" },
            { label: "НИЧЬИ", value: user.draws, color: "#f59e0b", icon: "🤝" },
            { label: "ПОРАЖ.", value: user.losses, color: "#f43f5e", icon: "💔" },
          ].map(s => (
            <div key={s.label} style={{ padding: "16px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: "Nunito", fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Win rate */}
        <div style={{ padding: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700 }}>Процент побед</span>
            <span style={{ fontWeight: 900, color: "#a5b4fc", fontSize: 16 }}>{winRate}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${winRate}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #a5b4fc)", borderRadius: 4, transition: "width 1s ease" }} />
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 8 }}>из {total} игр</div>
        </div>

        {/* Rank progress */}
        {nextRank && (
          <div style={{ padding: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700 }}>До ранга {nextRank.icon} {nextRank.name}</span>
              <span style={{ fontWeight: 900, color: "#f59e0b" }}>{user.wins}/{nextRank.threshold}</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #f59e0b, #fbbf24)", borderRadius: 4, transition: "width 1s ease" }} />
            </div>
          </div>
        )}

        {/* All ranks */}
        <div style={{ padding: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>ВСЕ РАНГИ</div>
          {ranks.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < ranks.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", opacity: user.wins >= r.threshold ? 1 : 0.35 }}>
              <span style={{ fontSize: 22 }}>{r.icon}</span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>{r.name}</span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{r.threshold}+ побед</span>
              {user.wins >= r.threshold && <span style={{ color: "#10b981", fontSize: 14 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
