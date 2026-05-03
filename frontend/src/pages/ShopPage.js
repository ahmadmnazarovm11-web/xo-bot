import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App";
import api from "../lib/api";
import { haptic } from "../lib/telegram";

export default function ShopPage() {
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState("skins"); // skins | topup

  const TOPUP_PACKAGES = [
    { coins: 100, price: 10, icon: "💰" },
    { coins: 500, price: 45, icon: "💰" },
    { coins: 1000, price: 85, icon: "💎" },
    { coins: 2500, price: 200, icon: "💎" },
    { coins: 5000, price: 380, icon: "👑" },
    { coins: 10000, price: 700, icon: "👑" },
  ];

  useEffect(() => {
    api.getSkins().then(r => { setSkins(r.skins); setLoading(false); });
  }, []);

  async function buy(skin_id) {
    setBusy(skin_id); setMsg(null);
    try {
      const res = await api.buySkin(user.id, skin_id);
      setUser(res.user);
      haptic.notification("success");
      setMsg({ type: "success", text: "🎉 Скин куплен!" });
    } catch (e) { haptic.notification("error"); setMsg({ type: "error", text: e.message }); }
    finally { setBusy(null); }
  }

  async function activate(skin_id) {
    if (user.active_skin === skin_id) return;
    setBusy(skin_id);
    try {
      const res = await api.activateSkin(user.id, skin_id);
      setUser(res.user);
      haptic.impact("light");
    } catch (e) {}
    finally { setBusy(null); }
  }

  async function requestTopup(pkg) {
    try {
      await api.topup(user.id, pkg.coins, "bank");
      haptic.notification("success");
      setMsg({ type: "success", text: "✅ Заявка отправлена! Администратор свяжется с вами." });
    } catch (e) { setMsg({ type: "error", text: e.message }); }
  }

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d14", paddingBottom: 88 }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0", marginBottom: 16 }}>
        <div style={{ fontFamily: "Nunito", fontSize: 28, fontWeight: 900, marginBottom: 4 }}>🛍 Магазин</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
          Баланс: <span style={{ color: "#f59e0b", fontWeight: 800 }}>🪙 {user.coins}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", margin: "0 16px 16px", background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4, gap: 4 }}>
        {[{ id: "skins", label: "✨ Скины" }, { id: "topup", label: "💰 Пополнить" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "Nunito", transition: "all 0.2s", background: tab === t.id ? "rgba(99,102,241,0.3)" : "transparent", color: tab === t.id ? "#a5b4fc" : "rgba(255,255,255,0.4)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ margin: "0 16px 12px", padding: "12px 16px", background: msg.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)", border: `1px solid ${msg.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`, borderRadius: 14, color: msg.type === "success" ? "#10b981" : "#f43f5e", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
          {msg.text}
        </div>
      )}

      {/* Skins tab */}
      {tab === "skins" && (
        <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
          {skins.map(skin => {
            const owned = user.owned_skins?.includes(skin.id);
            const active = user.active_skin === skin.id;
            const canAfford = user.coins >= skin.price;
            return (
              <div key={skin.id} style={{
                background: active ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${active ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 18, padding: 16, textAlign: "center", transition: "all 0.2s"
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  <span>{skin.x}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 4px", fontSize: 16 }}>/</span>
                  <span>{skin.o}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{skin.name}</div>
                {skin.price === 0
                  ? <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700, marginBottom: 8 }}>Бесплатно</div>
                  : <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 800, marginBottom: 8 }}>🪙 {skin.price}</div>
                }
                {active ? (
                  <div style={{ padding: "6px 12px", background: "rgba(99,102,241,0.2)", borderRadius: 8, fontSize: 12, color: "#a5b4fc", fontWeight: 700 }}>✓ Активен</div>
                ) : owned ? (
                  <button onClick={() => activate(skin.id)} disabled={busy === skin.id}
                    style={{ width: "100%", padding: "8px 0", border: "1.5px solid rgba(99,102,241,0.4)", borderRadius: 10, background: "transparent", color: "#a5b4fc", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                    Надеть
                  </button>
                ) : (
                  <button onClick={() => buy(skin.id)} disabled={busy === skin.id || !canAfford}
                    style={{ width: "100%", padding: "8px 0", border: "none", borderRadius: 10, background: canAfford ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.05)", color: canAfford ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: 800, fontSize: 13, cursor: canAfford ? "pointer" : "not-allowed" }}>
                    {busy === skin.id ? "..." : canAfford ? "Купить" : "Мало 🪙"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Topup tab */}
      {tab === "topup" && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ marginBottom: 16, padding: 14, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.5 }}>
            ℹ️ После нажатия администратор свяжется с вами в Telegram и вышлет реквизиты для оплаты.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {TOPUP_PACKAGES.map((pkg, i) => (
              <button key={i} onClick={() => { haptic.selection(); requestTopup(pkg); }}
                style={{
                  padding: "18px 12px", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 18,
                  background: "rgba(245,158,11,0.05)", cursor: "pointer", textAlign: "center", transition: "all 0.15s"
                }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{pkg.icon}</div>
                <div style={{ fontFamily: "Nunito", fontWeight: 900, fontSize: 22, color: "#f59e0b" }}>{pkg.coins.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, fontWeight: 600 }}>монет</div>
                <div style={{ padding: "6px 0", background: "rgba(245,158,11,0.2)", borderRadius: 8, color: "#fbbf24", fontWeight: 800, fontSize: 14 }}>
                  {pkg.price} ₽
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
