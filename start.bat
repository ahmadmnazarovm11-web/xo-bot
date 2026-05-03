@echo off
start "Cloudflare Frontend" cmd /k "cd /d C:\Users\MK\Desktop\xo_bot && cloudflared.exe tunnel --url http://localhost:3000 --no-autoupdate"
start "Cloudflare Backend" cmd /k "cd /d C:\Users\MK\Desktop\xo_bot && cloudflared.exe tunnel --url http://localhost:8000 --no-autoupdate"
start "Bot" cmd /k "cd /d C:\Users\MK\Desktop\xo_bot\backend && python bot.py"
start "Server" cmd /k "cd /d C:\Users\MK\Desktop\xo_bot\backend && uvicorn server:app --port 8000"
start "Frontend" cmd /k "cd /d C:\Users\MK\Desktop\xo_bot\frontend && npm start"