// A small, categorized emoji set for the built-in picker. Deliberately curated
// (not the full Unicode set) so we ship zero extra dependencies and keep the
// grid fast. Add categories/emoji freely — the picker renders whatever is here.

export interface EmojiCategory {
  id: string;
  label: string;
  /** Single glyph shown as the category tab. */
  icon: string;
  emojis: string[];
}

/** Quick-reaction row shown on message hover (WhatsApp/Slack-style). */
export const QUICK_REACTIONS: string[] = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys & People",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
      "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳",
      "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖",
      "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯",
      "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔",
      "🫡", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯",
      "😴", "🤤", "😪", "😮‍💨", "😵", "🤐", "🥴", "🤢", "🤮", "🤧",
      "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👍", "👎", "👏",
      "🙌", "👋", "🤝", "🙏", "💪", "🫶", "🤟", "✌️", "🤞", "👌",
    ],
  },
  {
    id: "hearts",
    label: "Hearts & Symbols",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "✅",
      "❌", "⭐", "🌟", "✨", "⚡", "🔥", "💯", "❗", "❓", "⚠️",
    ],
  },
  {
    id: "gestures",
    label: "Objects & Work",
    icon: "💼",
    emojis: [
      "💼", "📋", "📌", "📎", "🗂️", "📁", "📅", "📆", "🗓️", "⏰",
      "⌛", "📞", "📱", "💻", "🖥️", "⌨️", "🖨️", "📄", "📝", "✏️",
      "🖊️", "📊", "📈", "📉", "🔒", "🔑", "💊", "💉", "🩺", "🦷",
    ],
  },
  {
    id: "food",
    label: "Food & Activities",
    icon: "☕",
    emojis: [
      "☕", "🍵", "🥤", "🍕", "🍔", "🌮", "🍩", "🍪", "🎂", "🍰",
      "🍎", "🍌", "🥗", "🎉", "🎊", "🎈", "🏆", "🥇", "⚽", "🏀",
      "🎯", "🎮", "🎧", "🎵", "🚀", "✈️", "🚗", "🏠", "🌈", "☀️",
    ],
  },
];

/** Flat lookup used for search over the picker. */
export const ALL_EMOJIS: string[] = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

/** The default (first) category id. */
export const DEFAULT_CATEGORY_ID: string = EMOJI_CATEGORIES[0]?.id ?? "smileys";
