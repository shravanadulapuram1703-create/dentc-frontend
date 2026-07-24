// Scripted "echo peer" for the client-side simulation.
//
// With no messaging backend and (usually) a single logged-in user, we still want
// every real-time state to be visibly demonstrable: delivered/read ticks, typing
// indicators, and incoming messages. This module scripts a believable — and
// clearly LABELLED — peer response so the whole lifecycle plays out solo. It is
// pure: it returns a timed list of steps that localTransport executes. When the
// real backend lands, this file is deleted and realTransport drives these events
// from actual peers.

/** One scheduled action the simulated peer performs, `at` ms after your send. */
export type PeerStep =
  | { at: number; type: "read" } // peer read your message → your ticks turn blue
  | { at: number; type: "typing"; on: boolean }
  | { at: number; type: "reply"; text: string };

const REPLIES = [
  "Got it, thanks! 👍",
  "Sure, I'll take a look and get back to you.",
  "Sounds good.",
  "Can you share a bit more detail?",
  "On it — give me a few minutes.",
  "Thanks for the heads up.",
  "Perfect, that works for me.",
  "Let me check with the front desk and confirm.",
  "👍",
  "Will do!",
  "Noted. I'll update the chart.",
  "Great, see you then.",
];

const QUESTION_REPLIES = [
  "Good question — let me find out and circle back.",
  "I think so, but let me double-check.",
  "Yes, that should be fine.",
  "Not sure yet, I'll confirm shortly.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function jitter(base: number, spread: number): number {
  return Math.round(base + (Math.random() - 0.5) * 2 * spread);
}

/**
 * Build the simulated peer's reaction to one of your messages.
 * @param userText the text you just sent (drives a slightly smarter reply)
 * @param peerOnline when false, the peer only marks it delivered later — no read/reply
 */
export function scriptEchoResponse(
  userText: string,
  peerOnline: boolean,
): PeerStep[] {
  if (!peerOnline) return [];

  const isQuestion = /\?\s*$/.test(userText.trim());
  const replyText = isQuestion ? pick(QUESTION_REPLIES) : pick(REPLIES);

  const readAt = jitter(900, 300);
  const typingOnAt = readAt + jitter(500, 200);
  const typingOffAt = typingOnAt + jitter(1600, 700);

  return [
    { at: readAt, type: "read" },
    { at: typingOnAt, type: "typing", on: true },
    { at: typingOffAt, type: "typing", on: false },
    { at: typingOffAt + 60, type: "reply", text: replyText },
  ];
}

/** Occasional unprompted greeting when you first open a brand-new conversation. */
export function scriptGreeting(): PeerStep[] {
  const typingOnAt = jitter(1200, 300);
  const typingOffAt = typingOnAt + jitter(1400, 500);
  return [
    { at: typingOnAt, type: "typing", on: true },
    { at: typingOffAt, type: "typing", on: false },
    { at: typingOffAt + 60, type: "reply", text: "Hi! 👋 How can I help?" },
  ];
}
