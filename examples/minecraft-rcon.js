// Trigger something in Minecraft when you receive a gift.
//
// This is the classic setup: a viewer sends a gift, and the game reacts. It
// talks to a Minecraft server over RCON, so you need RCON enabled in your
// server.properties:
//
//   enable-rcon=true
//   rcon.password=changeme
//   rcon.port=25575
//
// Then install the two packages and run it with your key:
//   npm install @houla/live-connector rcon-client
//   HOULA_EVENT_KEY=hle_xxx RCON_PASSWORD=changeme node minecraft-rcon.js

const { HoulaLiveConnection } = require('@houla/live-connector');
const { Rcon } = require('rcon-client');

const RCON = {
  host: process.env.RCON_HOST || '127.0.0.1',
  port: Number(process.env.RCON_PORT || 25575),
  password: process.env.RCON_PASSWORD,
};

// Map a gift to a Minecraft command. Tweak this to taste. `qty` is how many
// of the gift were sent at once, so a combo can do more. Slugs come from the
// public gift catalogue: GET https://api.hou.la/api/gifts
function commandForGift(gift, qty) {
  switch (gift.slug) {
    case 'flame':
      // A small gift (Flamme, 3 coins), a small spark.
      return `summon minecraft:tnt ~ ~5 ~`;
    case 'diamond':
      // A mid-tier gift (199 coins), a mid-tier reward.
      return `give @p minecraft:diamond 8`;
    case 'fire_dragon':
      // A big gift (Fire Dragon, 4999 coins), a big reaction.
      return `execute at @p run summon minecraft:ender_dragon ~ ~10 ~`;
    default:
      // Anything else drops one TNT per unit, capped so a big combo stays fun.
      return `summon minecraft:tnt ~ ~${Math.min(qty, 10) + 4} ~`;
  }
}

async function main() {
  const rcon = await Rcon.connect(RCON);
  console.log('RCON connected to', `${RCON.host}:${RCON.port}`);

  const conn = new HoulaLiveConnection({ token: process.env.HOULA_EVENT_KEY });

  // De-dup on the transaction id: the same gift can arrive twice on a
  // reconnect, and you do not want to spawn the TNT twice.
  const seen = new Set();

  conn.on('connected', () => console.log('Listening for gifts.'));
  conn.on('error', (err) => console.error('Hou.la error:', err.message));

  conn.on('gift', async (gift) => {
    if (gift.transactionId && seen.has(gift.transactionId)) return;
    if (gift.transactionId) seen.add(gift.transactionId);

    const cmd = commandForGift(gift.gift, gift.gift.quantity);
    try {
      await rcon.send(cmd);
      console.log(`${gift.sender.name || 'Someone'} -> ${cmd}`);
    } catch (err) {
      console.error('RCON send failed:', err.message);
    }
  });

  conn.connect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
