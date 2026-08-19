// Quick check: does this game accept SYNTHETIC keyboard input?
// No Hou.la, no key, no live — just nut.js pressing a key. If the game reacts,
// the whole "gift → keypress" idea will work.
//
//   npm install @nut-tree-fork/nut-js
//   node examples/keytest.js
//
// Run it, then click the GAME window so it's focused. It sends the test key 3×.

const { keyboard, Key } = require('@nut-tree-fork/nut-js');
keyboard.config.autoDelayMs = 0;

// ↓ set this to a Meccha key that does something VISIBLE (jump, move, taunt…) ↓
const TEST_KEY = Key.Space;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('Focus the GAME window now — sending the test key in 3s (3×)…');
  await wait(3000);
  for (let i = 0; i < 3; i++) {
    await keyboard.type(TEST_KEY);
    await wait(600);
  }
  console.log('Done. Did the game react? If yes, synthetic input works. 🎉');
})();
