"""
Проверка подлинности данных от Telegram WebApp.
"""
import hashlib
import hmac
import json
from urllib.parse import parse_qs, unquote


def validate_telegram_data(init_data: str, bot_token: str) -> dict | None:
    if not init_data or not bot_token:
        return None
    try:
        params = parse_qs(init_data, keep_blank_values=True)
        data = {k: v[0] for k, v in params.items()}
        received_hash = data.pop("hash", None)
        if not received_hash:
            return None
        check_string = "\n".join(f"{k}={data[k]}" for k in sorted(data.keys()))
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        expected_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_hash, received_hash):
            return None
        user_raw = data.get("user")
        if not user_raw:
            return None
        return json.loads(unquote(user_raw))
    except Exception:
        return None
