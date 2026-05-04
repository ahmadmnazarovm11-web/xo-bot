"""
Главный сервер FastAPI — Крестики-Нолики бот.
Запуск: uvicorn server:app --reload --port 8000
"""
import asyncio
import json
import logging
import os
import random
import string
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from auth import validate_telegram_data
from game_engine import check_winner, is_draw, get_ai_move

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("server")

MONGO_URL = os.environ.get("DATABASE_URL", "mongodb://localhost:27017")
DB_NAME = "xo_game"
BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
ADMIN_CHAT_ID = os.environ.get("ADMIN_CHAT_ID", "")
BOT_USERNAME = os.environ.get("BOT_USERNAME", "")
WEB_APP_URL = os.environ.get("WEB_APP_URL", "")

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# ─── РАНГИ ───
RANKS = [
    (0,  "Новичок",  "🥚"),
    (5,  "Боец",     "⚔️"),
    (15, "Ветеран",  "🛡️"),
    (30, "Мастер",   "👑"),
    (60, "Легенда",  "🔥"),
]

def get_rank(wins: int) -> dict:
    name, icon = RANKS[0][1], RANKS[0][2]
    for threshold, rname, ricon in RANKS:
        if wins >= threshold:
            name, icon = rname, ricon
    return {"name": name, "icon": icon}

# ─── СКИНЫ ───
SKINS = [
    {"id": "classic",  "name": "Классика",    "x": "✕", "o": "○", "price": 0},
    {"id": "fire",     "name": "Огонь и Лёд", "x": "🔥", "o": "❄️", "price": 100},
    {"id": "space",    "name": "Космос",       "x": "🚀", "o": "🛸", "price": 150},
    {"id": "royal",    "name": "Королевский",  "x": "👑", "o": "💎", "price": 250},
    {"id": "aliens",   "name": "Пришельцы",    "x": "👽", "o": "💀", "price": 200},
    {"id": "animals",  "name": "Зверята",      "x": "🦁", "o": "🐻", "price": 180},
    {"id": "food",     "name": "Вкусняшки",    "x": "🍕", "o": "🍔", "price": 120},
    {"id": "magic",    "name": "Магия",         "x": "⚡", "o": "🌙", "price": 200},
    {"id": "hearts",   "name": "Любовь",        "x": "💘", "o": "💝", "price": 150},
    {"id": "sport",    "name": "Спорт",         "x": "⚽", "o": "🏀", "price": 130},
    {"id": "nature",   "name": "Природа",       "x": "🌸", "o": "🍀", "price": 160},
    {"id": "tech",     "name": "Технологии",    "x": "💻", "o": "🤖", "price": 220},
]

def get_skin(skin_id: str) -> Optional[dict]:
    return next((s for s in SKINS if s["id"] == skin_id), None)

# ─── МОДЕЛИ ───
class AuthPayload(BaseModel):
    init_data: Optional[str] = None
    dev_user_id: Optional[int] = None
    dev_username: Optional[str] = None

class BuySkinPayload(BaseModel):
    user_id: str
    skin_id: str

class SetSkinPayload(BaseModel):
    user_id: str
    skin_id: str

class TopUpPayload(BaseModel):
    user_id: str
    amount: int
    method: str

class CreateGamePayload(BaseModel):
    user_id: str
    bet: int = 0
    mode: str = "friend"  # friend | bot | bet

class JoinGamePayload(BaseModel):
    user_id: str
    code: str

# ─── ПОЛЬЗОВАТЕЛИ ───
def make_code(length=6):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

async def get_or_create_user(tg_id: int, username: str, first_name: str) -> dict:
    user = await db.users.find_one({"tg_id": tg_id}, {"_id": 0})
    if user:
        changes = {}
        if user.get("username") != username:
            changes["username"] = username
        if user.get("first_name") != first_name:
            changes["first_name"] = first_name
        if changes:
            await db.users.update_one({"tg_id": tg_id}, {"$set": changes})
            user.update(changes)
        return user
    new_user = {
        "id": str(uuid.uuid4()),
        "tg_id": tg_id,
        "username": username or f"player_{tg_id}",
        "first_name": first_name or "Игрок",
        "wins": 0, "losses": 0, "draws": 0,
        "coins": 500,
        "owned_skins": ["classic"],
        "active_skin": "classic",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one({**new_user})
    return new_user

def format_user(u: dict) -> dict:
    return {
        "id": u["id"], "tg_id": u["tg_id"],
        "username": u["username"], "first_name": u["first_name"],
        "wins": u["wins"], "losses": u["losses"], "draws": u.get("draws", 0),
        "coins": u["coins"], "rank": get_rank(u["wins"]),
        "owned_skins": u.get("owned_skins", ["classic"]),
        "active_skin": u.get("active_skin", "classic"),
    }

async def send_telegram_message(chat_id, text):
    if not BOT_TOKEN:
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            )
    except Exception as e:
        log.error(f"Ошибка Telegram: {e}")

# ─── ИГРА ───
class Game:
    def __init__(self, code, creator_id, bet, mode="friend"):
        self.code = code
        self.id = str(uuid.uuid4())
        self.mode = mode  # friend | bot | bet
        self.players: List[dict] = [{"user_id": creator_id, "symbol": "X"}]
        self.bet = bet
        self.board: List[Optional[str]] = [None] * 9
        self.turn: str = creator_id
        self.status: str = "waiting"
        self.winner_id: Optional[str] = None
        self.win_line: Optional[List[int]] = None
        self.sockets: Dict[str, WebSocket] = {}
        self.skins: Dict[str, dict] = {}
        self.lock = asyncio.Lock()
        self.last_action: float = asyncio.get_event_loop().time()
        self.is_bot_game = False

    def to_dict(self):
        return {
            "id": self.id, "code": self.code, "mode": self.mode,
            "bet": self.bet, "board": self.board, "turn": self.turn,
            "status": self.status, "winner_id": self.winner_id,
            "win_line": self.win_line, "players": self.players,
            "skins": self.skins, "is_bot_game": self.is_bot_game,
        }

    async def broadcast(self, data):
        disconnected = []
        for uid, ws in list(self.sockets.items()):
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self.sockets.pop(uid, None)

GAMES: Dict[str, Game] = {}

# ─── ТАЙМАУТ ───
async def timeout_watcher():
    while True:
        await asyncio.sleep(60)
        now = asyncio.get_event_loop().time()
        to_delete = []
        for code, game in list(GAMES.items()):
            if game.status == "finished":
                to_delete.append(code)
                continue
            elapsed = now - game.last_action
            timed_out = (
                (game.status == "waiting" and elapsed > 900) or
                (game.status == "playing" and elapsed > 300)
            )
            if timed_out:
                game.status = "finished"
                if game.bet > 0:
                    for p in game.players:
                        await db.users.update_one({"id": p["user_id"]}, {"$inc": {"coins": game.bet}})
                await game.broadcast({"type": "error", "message": "Время вышло — ставки возвращены"})
                to_delete.append(code)
        for code in to_delete:
            GAMES.pop(code, None)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Сервер запускается...")
    asyncio.create_task(timeout_watcher())
    yield
    mongo_client.close()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ─── АВТОРИЗАЦИЯ ───
@app.post("/api/auth")
async def auth(payload: AuthPayload):
    tg_user = None
    log.info(f"Auth: init_data={bool(payload.init_data)}, BOT_TOKEN={bool(BOT_TOKEN)}")
    if payload.init_data:
        tg_user = validate_telegram_data(payload.init_data, BOT_TOKEN)
        log.info(f"Telegram user: {tg_user}")
    if not tg_user and payload.dev_user_id:
        tg_user = {
            "id": payload.dev_user_id,
            "username": payload.dev_username or f"dev_{payload.dev_user_id}",
            "first_name": payload.dev_username or "Тестер",
        }
    if not tg_user:
        log.error(f"Auth failed! BOT_TOKEN set: {bool(BOT_TOKEN)}")
        raise HTTPException(status_code=401, detail="Ошибка авторизации")
    user = await get_or_create_user(
        tg_id=int(tg_user["id"]),
        username=tg_user.get("username", ""),
        first_name=tg_user.get("first_name", "Игрок"),
    )
    return {"user": format_user(user)}
# ─── ПРОФИЛЬ ───
@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    return {"user": format_user(user)}

@app.get("/api/leaderboard")
async def get_leaderboard():
    top = []
    async for u in db.users.find({}, {"_id": 0}).sort("wins", -1).limit(20):
        top.append({
            "username": u["username"], "first_name": u["first_name"],
            "wins": u["wins"], "losses": u["losses"],
            "rank": get_rank(u["wins"]),
        })
    return {"items": top}

# ─── МАГАЗИН ───
@app.get("/api/shop/skins")
async def list_skins():
    return {"skins": SKINS}

@app.post("/api/shop/buy")
async def buy_skin(payload: BuySkinPayload):
    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    skin = get_skin(payload.skin_id)
    if not skin:
        raise HTTPException(404, "Скин не найден")
    owned = user.get("owned_skins", ["classic"])
    if skin["id"] in owned:
        raise HTTPException(400, "Скин уже куплен")
    if user["coins"] < skin["price"]:
        raise HTTPException(400, "Недостаточно монет")
    owned.append(skin["id"])
    await db.users.update_one(
        {"id": payload.user_id},
        {"$inc": {"coins": -skin["price"]}, "$set": {"owned_skins": owned}},
    )
    updated = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    return {"user": format_user(updated)}

@app.post("/api/shop/activate")
async def activate_skin(payload: SetSkinPayload):
    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if payload.skin_id not in user.get("owned_skins", []):
        raise HTTPException(400, "Скин не куплен")
    await db.users.update_one({"id": payload.user_id}, {"$set": {"active_skin": payload.skin_id}})
    updated = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    return {"user": format_user(updated)}

# ─── ПОПОЛНЕНИЕ ───
@app.post("/api/topup")
async def request_topup(payload: TopUpPayload):
    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if payload.amount < 50 or payload.amount > 1_000_000:
        raise HTTPException(400, "Сумма должна быть от 50 до 1,000,000")
    request_id = str(uuid.uuid4())
    await db.topups.insert_one({
        "id": request_id, "user_id": user["id"], "tg_id": user["tg_id"],
        "username": user["username"], "amount": payload.amount,
        "method": payload.method, "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    if ADMIN_CHAT_ID:
        await send_telegram_message(ADMIN_CHAT_ID,
            f"💰 <b>Заявка на пополнение</b>\n"
            f"Игрок: @{user['username']}\n"
            f"Сумма: {payload.amount} монет\n"
            f"Метод: {payload.method}\n"
            f"ID: {request_id[:8]}"
        )
    return {"request_id": request_id, "message": "Заявка принята. Администратор свяжется с вами."}

# ─── ИГРЫ ───
@app.post("/api/games/create")
async def create_game(payload: CreateGamePayload):
    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if payload.bet < 0 or payload.bet > user["coins"]:
        raise HTTPException(400, "Недостаточно монет")

    code = make_code()
    while code in GAMES:
        code = make_code()

    game = Game(code=code, creator_id=user["id"], bet=payload.bet, mode=payload.mode)
    skin = get_skin(user.get("active_skin", "classic")) or SKINS[0]
    game.skins[user["id"]] = {"x": skin["x"], "o": skin["o"]}

    # Если игра с ботом — сразу добавляем бота
    if payload.mode == "bot":
        bot_id = "AI_BOT"
        game.players.append({"user_id": bot_id, "symbol": "O"})
        game.skins[bot_id] = {"x": "✕", "o": "○"}
        game.status = "playing"
        game.is_bot_game = True

    GAMES[code] = game

    if payload.bet > 0:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"coins": -payload.bet}})

    invite_link = f"https://t.me/{BOT_USERNAME}?start={code}" if BOT_USERNAME else f"?code={code}"
    return {"game": game.to_dict(), "invite_link": invite_link, "code": code}

@app.post("/api/games/join")
async def join_game(payload: JoinGamePayload):
    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    game = GAMES.get(payload.code.upper())
    if not game:
        raise HTTPException(404, "Игра не найдена")
    if game.status != "waiting":
        raise HTTPException(400, "Игра уже началась")
    if len(game.players) >= 2:
        raise HTTPException(400, "В игре уже два игрока")
    if any(p["user_id"] == user["id"] for p in game.players):
        raise HTTPException(400, "Ты уже в этой игре")
    if user["coins"] < game.bet:
        raise HTTPException(400, "Недостаточно монет")

    game.players.append({"user_id": user["id"], "symbol": "O"})
    if game.bet > 0:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"coins": -game.bet}})
    skin = get_skin(user.get("active_skin", "classic")) or SKINS[0]
    game.skins[user["id"]] = {"x": skin["x"], "o": skin["o"]}
    game.status = "playing"
    game.turn = game.players[0]["user_id"]
    game.last_action = asyncio.get_event_loop().time()
    await game.broadcast({"type": "state", "game": game.to_dict()})
    return {"game": game.to_dict()}

@app.get("/api/games/{code}")
async def get_game(code: str):
    game = GAMES.get(code.upper())
    if not game:
        raise HTTPException(404, "Игра не найдена")
    return {"game": game.to_dict()}

# ─── WEBSOCKET ───
@app.websocket("/ws/game/{code}/{user_id}")
async def websocket_game(ws: WebSocket, code: str, user_id: str):
    await ws.accept()
    game = GAMES.get(code.upper())
    if not game:
        await ws.send_json({"type": "error", "message": "Игра не найдена"})
        await ws.close()
        return
    if not any(p["user_id"] == user_id for p in game.players):
        await ws.send_json({"type": "error", "message": "Ты не участник"})
        await ws.close()
        return

    game.sockets[user_id] = ws
    await ws.send_json({"type": "state", "game": game.to_dict()})

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            if msg.get("type") == "move":
                await handle_move(game, user_id, int(msg.get("index", -1)))
            elif msg.get("type") == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        game.sockets.pop(user_id, None)
    except Exception as e:
        log.error(f"WS ошибка: {e}")
        game.sockets.pop(user_id, None)


async def handle_move(game: Game, user_id: str, index: int):
    async with game.lock:
        if game.status != "playing" or game.turn != user_id:
            return
        if index < 0 or index > 8 or game.board[index] is not None:
            return

        player = next(p for p in game.players if p["user_id"] == user_id)
        symbol = player["symbol"]
        creator_id = game.players[0]["user_id"]
        skins = game.skins.get(creator_id, {"x": "✕", "o": "○"})
        display = skins["x"] if symbol == "X" else skins["o"]

        game.board[index] = display
        game.last_action = asyncio.get_event_loop().time()

        # Проверяем победителя по символам
        raw_board = []
        for cell in game.board:
            if cell is None:
                raw_board.append(None)
            elif cell == skins["x"]:
                raw_board.append("X")
            else:
                raw_board.append("O")

        winner_symbol, line = check_winner(raw_board)
        if winner_symbol:
            game.status = "finished"
            game.winner_id = user_id
            game.win_line = list(line) if line else None
            await finish_game(game)
        elif is_draw(raw_board):
            game.status = "finished"
            game.winner_id = None
            await finish_game(game)
        else:
            other = next(p for p in game.players if p["user_id"] != user_id)
            game.turn = other["user_id"]

    await game.broadcast({"type": "state", "game": game.to_dict()})

    # Ход ИИ
    if game.is_bot_game and game.status == "playing" and game.turn == "AI_BOT":
        await asyncio.sleep(0.7)
        await make_bot_move(game)


async def make_bot_move(game: Game):
    async with game.lock:
        if game.status != "playing" or game.turn != "AI_BOT":
            return

        creator_id = game.players[0]["user_id"]
        skins = game.skins.get(creator_id, {"x": "✕", "o": "○"})

        raw_board = []
        for cell in game.board:
            if cell is None:
                raw_board.append(None)
            elif cell == skins["x"]:
                raw_board.append("X")
            else:
                raw_board.append("O")

        move = get_ai_move(raw_board, "O", "X")
        if move == -1:
            return

        game.board[move] = skins["o"]
        game.last_action = asyncio.get_event_loop().time()

        raw_board[move] = "O"
        winner_symbol, line = check_winner(raw_board)
        if winner_symbol:
            game.status = "finished"
            game.winner_id = "AI_BOT"
            game.win_line = list(line) if line else None
            await finish_game(game)
        elif is_draw(raw_board):
            game.status = "finished"
            game.winner_id = None
            await finish_game(game)
        else:
            game.turn = game.players[0]["user_id"]

    await game.broadcast({"type": "state", "game": game.to_dict()})


async def finish_game(game: Game):
    pot = game.bet * len([p for p in game.players if p["user_id"] != "AI_BOT"])
    if game.winner_id and game.winner_id != "AI_BOT":
        loser = next((p for p in game.players if p["user_id"] != game.winner_id and p["user_id"] != "AI_BOT"), None)
        await db.users.update_one({"id": game.winner_id}, {"$inc": {"wins": 1, "coins": pot}})
        if loser:
            await db.users.update_one({"id": loser["user_id"]}, {"$inc": {"losses": 1}})
    elif game.winner_id == "AI_BOT":
        human = next((p for p in game.players if p["user_id"] != "AI_BOT"), None)
        if human:
            await db.users.update_one({"id": human["user_id"]}, {"$inc": {"losses": 1}})
    else:
        for p in game.players:
            if p["user_id"] != "AI_BOT":
                await db.users.update_one({"id": p["user_id"]}, {"$inc": {"draws": 1, "coins": game.bet}})
# ─── ЗАПУСК БОТА ───
import asyncio
import threading

def run_bot():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    from bot import main
    loop.run_until_complete(main())

bot_thread = threading.Thread(target=run_bot, daemon=True)
bot_thread.start()