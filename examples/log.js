// Minimal example: print every gift you receive during your lives.
//
// Run it with your own key:
//   HOULA_EVENT_KEY=hle_xxx node log.js

const { HoulaLiveConnection } = require('houla-live-connector');

const conn = new HoulaLiveConnection({
  token: process.env.HOULA_EVENT_KEY,
});

conn.on('connected', (info) => {
  console.log('Connected. Listening for:', info.events.join(', '));
});

conn.on('gift', (gift) => {
  const who = gift.sender.name || 'Someone';
  console.log(`${who} sent ${gift.gift.quantity}x ${gift.gift.name} (${gift.gift.totalCoins} coins)`);
});

conn.on('disconnected', (reason) => console.log('Disconnected:', reason));
conn.on('error', (err) => console.error('Error:', err.message));

conn.connect();
