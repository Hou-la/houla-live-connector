// Celebrate a NEW FOLLOWER in Minecraft, live.
//
// When someone follows you DURING your live, the game reacts: fireworks, a
// welcome message, and a little something. The server already makes this safe —
// it fires at most once per follower per live, and an unfollow/re-follow loop is
// throttled for 24h — so you don't need your own anti-spam here.
//
// Two things to set up:
//  1. Your event key must include the "follow" event (pick it when you create
//     the key in the Hou.la studio).
//  2. RCON enabled in server.properties:
//       enable-rcon=true
//       rcon.password=changeme
//       rcon.port=25575
//
// Install and run:
//   npm install @houla/live-connector rcon-client
//   HOULA_EVENT_KEY=hle_xxx RCON_PASSWORD=changeme MC_PLAYER=YourPseudo node follow-rcon.js
//
// Dev testing: point at your dev API with HOULA_API_URL (defaults to prod).
//   HOULA_API_URL=http://192.168.86.91:53001 HOULA_EVENT_KEY=hle_xxx ... node follow-rcon.js
//
// Dry-run the EFFECT offline (no live, no follower, no Hou.la connection) — great
// first check that Minecraft reacts. Needs the local build (simulateFollow is
// newer than npm 0.3.0):
//   SIMULATE=1 RCON_PASSWORD=changeme MC_PLAYER=YourPseudo node follow-rcon.js

const { HoulaLiveConnection } = require('@houla/live-connector');
const { Rcon } = require('rcon-client');

const RCON = {
  host: process.env.RCON_HOST || '127.0.0.1',
  port: Number(process.env.RCON_PORT || 25575),
  password: process.env.RCON_PASSWORD,
};

// Who receives the effect in-game (usually you, the streamer).
const PLAYER = process.env.MC_PLAYER || '@p';

// What a new follower triggers. `name` is the follower's public name,
// `totalFollowers` is your new total (nice for milestones).
function commandsForFollow(name, totalFollowers) {
  const cmds = [
    // A burst of fireworks above the player.
    `execute at ${PLAYER} run summon minecraft:firework_rocket ~ ~2 ~ {LifeTime:20,FireworksItem:{id:"minecraft:firework_rocket",Count:1}}`,
    // A welcome banner on screen + chat.
    `title ${PLAYER} actionbar {"text":"Nouvel abonné : ${sanitize(name)} !","color":"aqua"}`,
    `say § Bienvenue ${sanitize(name)}, merci du soutien !`,
  ];
  // Milestone: every 100th follower, make it bigger.
  if (totalFollowers && totalFollowers % 100 === 0) {
    cmds.push(`execute at ${PLAYER} run summon minecraft:lightning_bolt ~ ~ ~`);
    cmds.push(`say § ${totalFollowers} abonnés ! 🎉`);
  }
  return cmds;
}

// Keep names safe inside a command / JSON string (no quotes, braces, newlines).
function sanitize(s) {
  return String(s || 'Quelqu’un').replace(/["{}\\\r\n]/g, '').slice(0, 40);
}

async function main() {
  const rcon = await Rcon.connect(RCON);
  console.log('RCON connected to', `${RCON.host}:${RCON.port}`);

  const conn = new HoulaLiveConnection({
    // 'sim' placeholder lets SIMULATE run without a key (we never connect then).
    token: process.env.HOULA_EVENT_KEY || 'sim',
    url: process.env.HOULA_API_URL, // undefined → defaults to prod
  });

  conn.on('connected', (info) =>
    console.log('Listening for new followers. Events:', info.events.join(', ')),
  );
  conn.on('error', (err) => console.error('Hou.la error:', err.message));

  conn.on('follow', async (f) => {
    const cmds = commandsForFollow(f.follower.name, f.totalFollowers);
    for (const cmd of cmds) {
      try {
        await rcon.send(cmd);
      } catch (err) {
        console.error('RCON send failed:', err.message);
      }
    }
    console.log(
      `+ follower ${f.follower.name || 'Someone'}` +
        (f.totalFollowers ? ` (total ${f.totalFollowers})` : ''),
    );
  });

  // Offline effect check — fire a synthetic follow and exit, no live needed.
  if (process.env.SIMULATE) {
    console.log('SIMULATE: firing a fake follow…');
    conn.simulateFollow({ name: 'Testeur', totalFollowers: 100 });
    setTimeout(() => process.exit(0), 500);
    return;
  }

  conn.connect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
