const BASE = "https://impacts-abstract-ranch-centered.trycloudflare.com";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true"
},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Ошибка сервера");
  return data;
}

const api = {
  auth: (init_data, dev_user_id, dev_username) =>
    req("POST", "/api/auth", { init_data, dev_user_id, dev_username }),

  getProfile: (user_id) => req("GET", `/api/profile/${user_id}`),
  getLeaderboard: () => req("GET", "/api/leaderboard"),

  getSkins: () => req("GET", "/api/shop/skins"),
  buySkin: (user_id, skin_id) => req("POST", "/api/shop/buy", { user_id, skin_id }),
  activateSkin: (user_id, skin_id) => req("POST", "/api/shop/activate", { user_id, skin_id }),

  topup: (user_id, amount, method) => req("POST", "/api/topup", { user_id, amount, method }),

  createGame: (user_id, bet, mode) => req("POST", "/api/games/create", { user_id, bet, mode }),
  joinGame: (user_id, code) => req("POST", "/api/games/join", { user_id, code }),
  getGame: (code) => req("GET", `/api/games/${code}`),
};

export default api;
