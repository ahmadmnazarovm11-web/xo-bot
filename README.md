# 🎮 XO GAME — Инструкция по запуску

## Структура проекта
```
xo_bot/
├── backend/
│   ├── .env          ← настройки
│   ├── setup.py      ← запусти первым!
│   ├── requirements.txt
│   ├── bot.py        ← Telegram бот
│   ├── server.py     ← FastAPI сервер
│   ├── auth.py
│   └── game_engine.py
└── frontend/
    ├── .env
    ├── package.json
    └── src/
```

---

## 🚀 Запуск (4 терминала)

### Шаг 1 — Установи зависимости (один раз)

```powershell
cd backend
python setup.py
pip install -r requirements.txt --only-binary=:all:
```

```powershell
cd frontend
npm install
```

---

### Шаг 2 — Запусти ngrok

```powershell
.\ngrok.exe http 3000
```

Скопируй URL вида `https://abc123.ngrok-free.dev`

---

### Шаг 3 — Обнови WEB_APP_URL

Открой `backend/.env` и замени:
```
WEB_APP_URL=https://abc123.ngrok-free.dev
```

Также обнови `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:8000
```

---

### Шаг 4 — Запусти всё (3 терминала)

**Терминал 1 — Бот:**
```powershell
cd backend
python bot.py
```

**Терминал 2 — Сервер:**
```powershell
cd backend
uvicorn server:app --reload --port 8000
```

**Терминал 3 — Фронтенд:**
```powershell
cd frontend
npm start
```

---

## ✅ Готово!

Открой @xo_tetris_bot в Telegram и нажми /start

---

## 🎮 Функции

- **Игра с ботом** — ИИ на минимакс алгоритме
- **Игра с другом** — по коду
- **Ставки** — игра на монеты
- **Магазин** — 8 скинов для X и O
- **Профиль** — ранги, статистика
- **Пополнение** — заявки администратору
- **Таблица лидеров** — топ игроков
