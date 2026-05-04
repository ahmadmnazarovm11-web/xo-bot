"""
Telegram бот — Крестики-Нолики
Запуск: python bot.py
"""
import asyncio
import logging
import os
from pathlib import Path

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("bot")

TOKEN = os.environ.get("BOT_TOKEN", "")
WEB_APP_URL = os.environ.get("WEB_APP_URL", "")
BOT_USERNAME = os.environ.get("BOT_USERNAME", "")


def make_keyboard(game_code: str = "") -> InlineKeyboardMarkup:
    url = WEB_APP_URL
    if game_code:
        url = f"{url}?code={game_code}"
    buttons = [
        [InlineKeyboardButton(text="🎮 Играть", web_app=WebAppInfo(url=url))],
        [InlineKeyboardButton(
            text="📨 Пригласить друга",
            switch_inline_query=f"Играем в крестики-нолики! Заходи: https://t.me/{BOT_USERNAME}",
        )],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


async def main():
    if not TOKEN:
        log.error("BOT_TOKEN не задан в .env файле!")
        return
    if not WEB_APP_URL:
        log.error("WEB_APP_URL не задан в .env файле!")
        return

    bot = Bot(token=TOKEN)
    await bot.delete_webhook(drop_pending_updates=True)
    dp = Dispatcher()
    @dp.message(CommandStart(deep_link=True))
    async def cmd_start_with_code(msg: Message, command: CommandObject):
        code = (command.args or "").strip().upper()
        text = (
            f"🎮 <b>Крестики-Нолики</b>\n\n"
            f"Тебя пригласили на игру!\n"
            f"Код игры: <code>{code}</code>\n\n"
            f"Нажми кнопку ниже чтобы войти в игру 👇"
        )
        await msg.answer(text, reply_markup=make_keyboard(code), parse_mode="HTML")

    @dp.message(CommandStart())
    async def cmd_start(msg: Message):
        name = msg.from_user.first_name or "Игрок"
        text = (
            f"👋 Привет, {name}!\n\n"
            f"🎮 <b>Крестики-Нолики</b> — играй с друзьями онлайн!\n\n"
            f"• Играй с ботом или с другом\n"
            f"• Делай ставки монетами\n"
            f"• Побеждай и качай ранг\n"
            f"• Покупай скины для X и O\n\n"
            f"Нажми кнопку ниже чтобы начать 👇"
        )
        await msg.answer(text, reply_markup=make_keyboard(), parse_mode="HTML")

    @dp.message(F.text == "/help")
    async def cmd_help(msg: Message):
        text = (
            "📖 <b>Помощь</b>\n\n"
            "/start — открыть игру\n"
            "/help — эта справка\n\n"
            "Если есть вопросы — пиши администратору."
        )
        await msg.answer(text, reply_markup=make_keyboard(), parse_mode="HTML")

    log.info("Бот запущен! Нажми Ctrl+C чтобы остановить.")
    await dp.start_polling(bot, handle_signals=False)


if __name__ == "__main__":
    asyncio.run(main())
