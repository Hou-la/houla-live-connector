# @houla/live-connector

Receive your Hou.la live events (gifts, hearts, chat and more) in real time, and do whatever you want with them: show an alert on an OBS overlay, spawn a mob in Minecraft, flash your lights, run a bot.

If you have used `tiktok-live-connector` before, this will feel familiar. You create a connection, you listen for events, that is it.

```js
const { HoulaLiveConnection } = require('@houla/live-connector');

const conn = new HoulaLiveConnection({ token: 'hle_your_key_here' });

conn.on('gift', (gift) => {
  console.log(`${gift.sender.name} sent ${gift.gift.name}`);
});

conn.connect();
```

## Install

```bash
npm install @houla/live-connector
```

Node 18 or newer.

## Get a key

The connection needs a key, not your password. The key is read only. It can receive events, nothing else. It cannot post, spend, or change anything on your account.

1. Open the Hou.la studio and go to Event keys.
2. Create a key, pick the events you want (gifts, hearts, and so on).
3. Copy it. It is shown once. If you lose it, rotate it and the old one stops working.

A key belongs to a workspace and only ever receives that workspace's own live events. You cannot listen to someone else's live.

## Events

Listen with `.on(type, handler)`.

| Event | Fires when |
| --- | --- |
| `connected` | the key is accepted and the stream is open |
| `gift` | a gift is received on one of your lives |
| `disconnected` | the connection drops |
| `error` | the key is rejected or the socket fails |

There is also a catch all `event` that fires for everything, which is handy for logging:

```js
conn.on('event', (envelope) => {
  console.log(envelope.type, envelope.data);
});
```

Gifts are fully typed today. Other event types (hearts, comments, viewers, polls, gift goals) can be selected on a key and will start flowing as they come online, on the same `event` channel and the same envelope shape, so nothing changes in your code when they do.

### Gift payload

```ts
{
  transactionId: string | null,
  live: { roomId: string, workspaceId: string },
  gift: {
    id: string,
    slug: string,        // stable id, good for mapping rules
    name: string,
    category: string | null,
    coinCost: number,    // price of one unit
    quantity: number,    // how many were sent at once
    totalCoins: number,  // what was actually spent
    totalStars: number,
    thumbnailUrl: string | null,
    animationDurationMs: number | null
  },
  sender: {
    workspaceId: string | null,
    name: string | null,
    avatarUrl: string | null
  }
}
```

## De-duplicate with transactionId

The same gift can reach you more than once, for example right after a reconnect. If your handler does something you cannot take back, like spawning a mob or firing a payout, skip anything you have already seen:

```js
const seen = new Set();

conn.on('gift', (gift) => {
  if (gift.transactionId && seen.has(gift.transactionId)) return;
  if (gift.transactionId) seen.add(gift.transactionId);
  // safe to act now
});
```

## Gift reference

To map a gift to an action you need its `slug`. The full, always-current gift catalogue is public, no key required:

```
GET https://api.hou.la/api/gifts
```

Every active gift, with the fields that matter for an integration:

```json
{
  "slug": "flame",
  "name": "Flame",
  "coinCost": 3,
  "category": "chat_png",
  "thumbnailUrl": "https://.../gifts/.../flame.png"
}
```

- `slug` is the stable id. Match on it, not on `name` (display text, can change or be localized).
- `coinCost` is the value in coins, handy for "bigger gift, bigger reaction" logic.
- `thumbnailUrl` is a PNG on the CDN, ready to drop into an overlay.

New gifts show up here on their own, so fetch it at startup rather than hard-coding a list.

## Examples

See the [`examples`](./examples) folder.

- [`log.js`](./examples/log.js) prints every gift.
- [`minecraft-rcon.js`](./examples/minecraft-rcon.js) turns a gift into a Minecraft command over RCON. This is the "send a gift, something happens in the game" setup. Map each gift slug to whatever you like.

## Options

```ts
new HoulaLiveConnection({
  token: 'hle_...',   // required
  url: 'https://api.hou.la', // optional, override for local dev only
  reconnect: true,    // optional, on by default
});
```

## How it works

The connector opens a WebSocket to Hou.la and joins a room for each event type you selected. Events are pushed to you as they happen. There is no polling and no public endpoint to expose on your side, so it works from a laptop behind a router without any setup.

Connections are rate limited and capped per key. If you open too many at once, or reconnect in a tight loop, some will be refused. Keep one connection per process and let it reconnect on its own.

## Contributing

Issues and pull requests are welcome. Extra bridges (Streamer.bot, OBS, home automation, other games) make good examples, keep them small and dependency light.

## License

MIT. See [LICENSE](./LICENSE).
