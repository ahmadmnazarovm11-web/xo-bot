import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { useApp } from "../App";

export default function LeaderboardPage() {
  const { user } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard().then(r => { setItems(r.items); setLoading(false); });
  }, []);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="page animate-fade">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "Unbounded", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          🏆 Таблица лидеров
        </div>
        <div style={{ color: "var(--text2)", fontSize: 13 }}>Топ игроков по победам</div>
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text2)", marginTop: 40 }}>
          Ещё никто не играл 🙃
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => {
          const isMe = item.username === user.username;
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px",
              background: isMe ? "rgba(124,92,252,0.1)" : "var(--card)",
              border: `1.5px solid ${isMe ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "var(--radius)", transition: "all 0.2s"
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: i < 3 ? "transparent" : "var(--bg3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Unbounded", fontWeight: 700, fontSize: i < 3 ? 24 : 14,
                color: "var(--text2)", flexShrink: 0
              }}>
                {i < 3 ? medals[i] : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 15, color: isMe ? "var(--accent3)" : "var(--text)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {item.first_name}
                  {isMe && <span style={{ color: "var(--accent)", fontSize: 11, marginLeft: 6 }}>ты</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)" }}>
                  {item.rank.icon} {item.rank.name}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Unbounded", fontWeight: 700, color: "var(--green)", fontSize: 16 }}>
                  {item.wins}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>побед</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
