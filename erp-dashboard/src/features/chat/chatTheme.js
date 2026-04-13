/**
 * Chat theme tokens — all colors are centralized here.
 * Override these CSS variables in light/dark mode to change the chat look.
 */

export const CHAT_THEME = {
  light: {
    bg: "bg-white",
    surface: "bg-slate-50",
    surfaceHover: "hover:bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    textSubtle: "text-slate-400",
    sentBubble: "bg-gradient-to-br from-amber-500 to-amber-600 text-white",
    receivedBubble: "bg-slate-100 text-slate-900",
    inputBg: "bg-slate-100 focus:bg-white",
    headerBg: "bg-white",
    sidebarBg: "bg-slate-50",
    activeChat:
      "bg-amber-50 border-l-2 border-amber-500",
    onlineDot: "bg-emerald-500",
    offlineDot: "bg-slate-400",
    skeleton: "bg-slate-200 animate-pulse",
    dateLabel: "bg-slate-200/80 text-slate-600",
    unreadBadge: "bg-amber-500 text-white",
    systemMsg: "bg-slate-100 text-slate-500",
    emojiPickerBg: "bg-white border border-slate-200",
    contextBg: "bg-white border border-slate-200 shadow-lg",
    wallpaper: "bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.04)_1px,_transparent_0)] bg-[size:24px_24px] bg-slate-50",
  },
  dark: {
    bg: "dark:bg-slate-900",
    surface: "dark:bg-slate-800",
    surfaceHover: "dark:hover:bg-slate-700",
    border: "dark:border-slate-700",
    text: "dark:text-slate-100",
    textMuted: "dark:text-slate-400",
    textSubtle: "dark:text-slate-500",
    sentBubble: "dark:bg-gradient-to-br dark:from-amber-500 dark:to-amber-600 dark:text-white",
    receivedBubble: "dark:bg-slate-800 dark:text-slate-100",
    inputBg: "dark:bg-slate-800 dark:focus:bg-slate-700",
    headerBg: "dark:bg-slate-900",
    sidebarBg: "dark:bg-slate-900",
    activeChat: "dark:bg-amber-900/20 dark:border-amber-500",
    onlineDot: "dark:bg-emerald-400",
    offlineDot: "dark:bg-slate-600",
    skeleton: "dark:bg-slate-700 dark:animate-pulse",
    dateLabel: "dark:bg-slate-700/80 dark:text-slate-400",
    unreadBadge: "dark:bg-amber-500 dark:text-white",
    systemMsg: "dark:bg-slate-800 dark:text-slate-400",
    emojiPickerBg: "dark:bg-slate-800 dark:border-slate-700",
    contextBg: "dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900",
    wallpaper: "dark:bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.03)_1px,_transparent_0)] dark:bg-[size:24px_24px] dark:bg-slate-900",
  },
};

/** Helper: combine light+dark tokens for a key */
export const t = (key) =>
  `${CHAT_THEME.light[key] || ""} ${CHAT_THEME.dark[key] || ""}`.trim();
