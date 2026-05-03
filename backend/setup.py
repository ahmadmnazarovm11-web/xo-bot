"""
Запусти этот файл ОДИН РАЗ перед стартом:
python setup.py
"""
import os
from pathlib import Path

ROOT = Path(__file__).parent

env_content = (
    "BOT_TOKEN=8570240407:AAGcWYZ7XvPtsoGL1NA-OYLXh2_9UmxotSE\n"
    "BOT_USERNAME=xo_tetris_bot\n"
    "DATABASE_URL=mongodb://localhost:27017/xo_game\n"
    "WEB_APP_URL=ЗАМЕНИ_НА_СВОЙ_NGROK_URL\n"
    "ADMIN_CHAT_ID=\n"
)

env_path = ROOT / ".env"
with open(env_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(env_content)

print("✅ .env файл создан без BOM!")
print()
print("⚠️  Не забудь заменить WEB_APP_URL на свой ngrok URL!")
print("   Пример: https://abc123.ngrok-free.dev")
