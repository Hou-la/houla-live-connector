// Turn Hou.la gifts into SYNTHETIC KEYBOARD actions, for Steam games that have no
// API/RCON but DO accept synthetic input. A viewer sends a gift → the connector
// presses a key for you.
//
// ⚠️ MECCHA CHAMELEON DOES NOT WORK THIS WAY (verified 2026-08-24). Meccha (like
// many anti-cheat / low-level-input games) IGNORES nut.js synthetic keys entirely
// — the character does not react, even run as admin. AutoHotkey usually fails too.
// The keyboard mapping BELOW is kept only as a generic template for games that DO
// accept synthetic input; do NOT expect it to drive Meccha.
//
// ✅ To actually control Meccha (and other synthetic-input-proof games), use the
// **Hou.la Connect** desktop app: it ships a verified ViGEm sidecar that presents a
// VIRTUAL XBOX CONTROLLER (real HID device, works where nut.js can't, and — bonus —
// needs no window focus, and you keep playing on your own keyboard alongside it).
// Repo: Hou-la/houla-connect-app. This npm SDK stays the DEVELOPER path; the app is
// the turnkey path and the only one that solves Meccha.
//
// How it works: we listen for gifts and synthesise a keypress with nut.js. Note:
//   1. The GAME WINDOW MUST BE FOCUSED — a synthetic key goes to the active window.
//   2. Games that ignore synthetic input (Meccha, most anti-cheat titles) → use the
//      app instead (ViGEm). Test yours first with SIMULATE below.
//
// Install and run:
//   npm install @houla/live-connector @nut-tree-fork/nut-js
//   HOULA_EVENT_KEY=hle_xxx node meccha-keys.js
//
// Point at your dev API while testing:  HOULA_API_URL=http://192.168.86.91:53001 …
// Followers only (optional):            FOLLOWERS_ONLY=1 …
//
// TEST IT FIRST (no live, no key needed) — open the game, focus its window, then:
//   SIMULATE=1 SIM_SLUG=fire_dragon node meccha-keys.js
//   → if your character reacts, synthetic input works and you're good to go.

// Resolves whether you `npm install @houla/live-connector` OR run it from inside
// this repo (where the package name isn't in node_modules — fall back to build).
let HoulaLiveConnection;
try {
  ({ HoulaLiveConnection } = require('@houla/live-connector'));
} catch {
  ({ HoulaLiveConnection } = require('..'));
}
const { keyboard, Key } = require('@nut-tree-fork/nut-js');

keyboard.config.autoDelayMs = 0; // we handle our own timing

// ── Gift → key mapping ────────────────────────────────────────────────────
// Left  = the gift slug (public catalogue: GET https://api.hou.la/api/gifts).
// Right = a KEY SPEC. Replace the keys with YOUR Meccha binds (Options › Controls):
//   'c'            a single key
//   'shift+c'      a combo (modifiers: shift / ctrl / alt)
//   'c,c,c'        a sequence (three taps)
//   'space:400'    hold the key for 400 ms
// Anything not listed here is ignored, so extra gifts do nothing.
const MAP = {
  // gift slug           key(s)   Meccha action (your binds)
  flame: '1', //                 taunt / provocation — the whistle that exposes you 🔥
  diamond: 'r', //               force a pose
  fire_dragon: 'f', //           paint mode (colour chaos)
  'super-star': 'space', //      jump
  galaxy: 'shift', //            release your hiding pose (Shift) — breaks your camouflage
  neo_yokai_portal: 'shift,space,1', // panic: unfreeze + jump + taunt (fully exposed)
  // Movement is ZQSD on your AZERTY. nut.js is QWERTY-positional, so the physical
  // Z and Q land on the wrong keys → for moves use 'w' (=Z) and 'a' (=Q); 's'/'d'
  // are the same on both. We'll confirm/fix these once the core actions test OK.
};

// Which key names you can use in the specs above.
const KEYS = {
  space: Key.Space, enter: Key.Enter, tab: Key.Tab, esc: Key.Escape,
  up: Key.Up, down: Key.Down, left: Key.Left, right: Key.Right,
  shift: Key.LeftShift, ctrl: Key.LeftControl, alt: Key.LeftAlt,
};
for (const c of 'abcdefghijklmnopqrstuvwxyz') KEYS[c] = Key[c.toUpperCase()];
for (let n = 0; n <= 9; n++) KEYS[String(n)] = Key['Num' + n];
for (let f = 1; f <= 12; f++) KEYS['f' + f] = Key['F' + f];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function resolve(token) {
  const k = KEYS[token.trim().toLowerCase()];
  if (!k) throw new Error(`unknown key "${token}"`);
  return k;
}

// Run one key spec: sequence of steps split by ',', each step "mod+key" or "key:ms".
async function pressSpec(spec) {
  for (const rawStep of String(spec).split(',')) {
    const [combo, holdMs] = rawStep.split(':');
    const keys = combo.split('+').map(resolve);
    if (holdMs) {
      await keyboard.pressKey(...keys);
      await sleep(Number(holdMs) || 0);
      await keyboard.releaseKey(...keys);
    } else {
      await keyboard.type(...keys); // press + release
    }
    await sleep(40); // small gap between taps in a sequence
  }
}

// ── Wiring ────────────────────────────────────────────────────────────────
async function fire(gift) {
  const spec = MAP[gift.gift.slug];
  if (!spec) return;
  try {
    await pressSpec(spec);
    console.log(`${gift.sender.name || 'Someone'} → ${gift.gift.slug} → [${spec}]`);
  } catch (err) {
    console.error('key press failed:', err.message);
  }
}

async function main() {
  const conn = new HoulaLiveConnection({
    token: process.env.HOULA_EVENT_KEY || 'sim',
    url: process.env.HOULA_API_URL,
  });

  // De-dup: the same gift can arrive twice on a reconnect.
  const seen = new Set();

  conn.on('connected', (info) =>
    console.log('Listening. Keep the game window focused. Events:', info.events.join(', ')),
  );
  conn.on('error', (err) => console.error('Hou.la error:', err.message));

  conn.on('gift', async (gift) => {
    if (gift.transactionId && seen.has(gift.transactionId)) return;
    if (gift.transactionId) seen.add(gift.transactionId);
    // Optional: only followers can mess with you.
    if (process.env.FOLLOWERS_ONLY && !gift.sender.isFollower) return;
    await fire(gift);
  });

  // Offline test: fire one mapped key and exit — no live, no key needed.
  if (process.env.SIMULATE) {
    const slug = process.env.SIM_SLUG || 'fire_dragon';
    console.log(`SIMULATE: focus the game, firing "${slug}" in 3s…`);
    await sleep(3000);
    await fire({ gift: { slug }, sender: { name: 'Test' } });
    process.exit(0);
  }

  conn.connect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
