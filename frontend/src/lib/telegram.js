const tg = window.Telegram?.WebApp;

export const initTelegram = () => {
  if (tg) { tg.ready(); tg.expand(); }
  return tg;
};

export const getInitData = () => tg?.initData || "";

export const haptic = {
  impact: (style = "medium") => tg?.HapticFeedback?.impactOccurred(style),
  notification: (type = "success") => tg?.HapticFeedback?.notificationOccurred(type),
  selection: () => tg?.HapticFeedback?.selectionChanged(),
};
