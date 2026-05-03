import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App";
import api from "../lib/api";
import { haptic } from "../lib/telegram";

const METHODS = [
  { id: "usdt", label: "USDT TRC20", icon: "₮" },
  { id: "btc",  label: "Bitcoin",    icon: "₿" },
  { id: "ton",  label: "TON",        icon: "💎" },
  { id: "bank", label: "Банк РФ",    icon: "🏦" },
];

const AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export default function TopUpPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState("usdt");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (amount < 50) { setError("Минимум 50 монет"); return; }
    setLoading(true);
    setError("");
    try {
      await api.topup(user.id, amount, method);
      haptic.notification("success");
      setDone(true);
    } catch (e) {
      setError(e.message);
      haptic.notification("error");
    } finally {
      setLoading(false);
    }
  }

  if (done) return (
    <div className="page animate-fade" style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <div style={{ fontFamily: "Unbounded", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Заявка отправлена!
      </div>
      <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        Администратор свяжется с тобой в Telegram в ближайшее время.
      </p>
      <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate("/")}>
        На главную
      </button>
    </div>
  );

  return (
    <div className="page animate-fade">
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          ← Назад
        </button>
        <div style={{ fontFamily: "Unbounded", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Пополнение
        </div>
        <div style={{ color: "var(--text2)", fontSize: 13 }}>
          Текущий баланс: <span className="coins">{user.coins}</span>
        </div>
      </div>

      {/* Amount */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>СУММА МОНЕТ</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          {AMOUNTS.map(v => (
            <button key={v}
              className={`btn ${amount === v ? "btn-primary" : "btn-secondary"}`}
              onClick={() => { haptic.selection(); setAmount(v); }}
            >🪙 {v}</button>
          ))}
        </div>
        <input className="input" type="number" placeholder="Своя сумма (мин. 50)"
          value={amount} min={50}
          onChange={e => setAmount(Number(e.target.value))}
        />
      </div>

      {/* Method */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>СПОСОБ ОПЛАТЫ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {METHODS.map(m => (
            <button key={m.id}
              className={`btn ${method === m.id ? "btn-primary" : "btn-secondary"}`}
              style={{ justifyContent: "flex-start", gap: 12 }}
              onClick={() => { haptic.selection(); setMethod(m.id); }}
            >
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <span>{m.label}</span>
              {method === m.id && <span style={{ marginLeft: "auto" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div style={{
        padding: 14, background: "rgba(124,92,252,0.1)",
        border: "1px solid rgba(124,92,252,0.2)", borderRadius: 10,
        color: "var(--accent3)", fontSize: 13, lineHeight: 1.6, marginBottom: 24
      }}>
        ℹ️ После отправки заявки администратор свяжется с тобой в Telegram и вышлет реквизиты для оплаты.
      </div>

      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 16px",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, color: "var(--red)", fontSize: 13, textAlign: "center"
        }}>{error}</div>
      )}

      <button className="btn btn-gold btn-lg btn-block" onClick={submit} disabled={loading}>
        {loading ? "Отправляем..." : `Отправить заявку на ${amount} монет`}
      </button>
    </div>
  );
}
