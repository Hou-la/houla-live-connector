// Isolation test: does nut.js type ANYTHING at all (independent of any game)?
// Open Notepad (or any text box), focus it, and run:
//   node examples/typetest.js
// If "hello nut.js" appears in Notepad → nut.js works, and the issue is the game
// ignoring synthetic input (fix: run your terminal AS ADMINISTRATOR, or AutoHotkey).
// If NOTHING appears → nut.js itself isn't pressing keys (install/permissions).

const { keyboard } = require('@nut-tree-fork/nut-js');
keyboard.config.autoDelayMs = 20;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('Open Notepad, click inside it — typing in 3s…');
  await wait(3000);
  await keyboard.type('hello nut.js');
  console.log('Done. Did "hello nut.js" appear in Notepad?');
})();
