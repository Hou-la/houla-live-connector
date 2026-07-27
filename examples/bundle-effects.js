// Bundle → real-world effects, with per-slot cooldown, plus offline sandbox.
//
// Loads a bundle's effect preset (the same bundle.json shape used by the
// community repo), wires each reserved slot to a command, and fires it when a
// matching interactive gift arrives. With no key set it runs OFFLINE and uses
// simulateGift() so you can dry-run your effects before going live.
//
// Run against a live:   HOULA_KEY=hle_xxx MC_PLAYER=Steve node examples/bundle-effects.js
// Run in the sandbox:   node examples/bundle-effects.js
//
// From the published package, require('@houla/live-connector'). From this repo
// (after `npm run build`), require('../dist').
const path = require('path');
const { HoulaLiveConnection, loadPreset, applyPreset } = require('../dist');

// A real integration would `rcon.send(command)` / drive OBS websocket / POST an
// HTTP webhook here. We just log so the example runs anywhere.
async function runEffect(command, gift) {
  console.log(
    `[effect] ${gift.gift.slug} ×${gift.gift.quantity} from ${gift.sender.name} -> ${command}`,
  );
}

const preset = loadPreset(path.join(__dirname, 'gaming-fx.bundle.json'));

const conn = new HoulaLiveConnection({
  token: process.env.HOULA_KEY || 'hle_sandbox',
  url: process.env.HOULA_URL, // e.g. http://127.0.0.1:53001 for local dev
});

applyPreset(conn, preset, {
  cooldownMs: 1500, // default when a slot has no cooldownMs
  vars: { player: process.env.MC_PLAYER || 'Steve' }, // fills {player}
  onCommand: runEffect,
});

if (process.env.HOULA_KEY) {
  conn.on('connected', (info) => console.log('connected:', info));
  conn.on('error', (err) => console.error('error:', err.message));
  conn.connect();
} else {
  console.log('No HOULA_KEY set — SANDBOX mode (simulated gifts):\n');
  conn.simulateGift({ slug: 'ix_slot_01', senderName: 'Alice' });
  conn.simulateGift({ slug: 'ix_slot_09', senderName: 'Bob' });
  conn.simulateGift({ slug: 'ix_slot_09', senderName: 'Bob' }); // within cooldown → skipped
  conn.simulateGift({ slug: 'ix_slot_99', senderName: 'Eve' }); // not in preset → ignored
  setTimeout(() => console.log('\nsandbox done.'), 100);
}
