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

Connection events:

| Event | Fires when |
| --- | --- |
| `connected` | the key is accepted and the stream is open |
| `disconnected` | the connection drops |
| `error` | the key is rejected or the socket fails |

Live events — pick which ones a key receives when you create it:

| Event | Fires when |
| --- | --- |
| `gift` | a gift is received on one of your lives |
| `hearts` | the live's heart total updates |
| `comment` | a comment is approved in your chat |
| `viewer` | a viewer joins, shares, opens your shop or adds to cart |
| `poll` | a poll starts, its tally updates, or it closes (switch on `poll.phase`) |
| `gift_goal` | a gift-goal's progress advances |

All events are fully typed. There is also a catch all `event` that fires for everything, handy for logging:

```js
conn.on('event', (envelope) => {
  console.log(envelope.type, envelope.data);
});
```

Every payload carries only public display identity — a workspace's name, avatar, handle and verified badge — never private account data. Each live event includes `live: { roomId, workspaceId }`.

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

### Other event payloads

`live` is `{ roomId, workspaceId }` on every event. Full TypeScript types ship with the package.

```ts
// hearts
{ live, totalHearts: number }

// comment
{ live,
  comment: { id, content, parentId, serverSequence, createdAt },
  author:  { workspaceId, name, avatarUrl, slug, isVerified } }

// viewer
{ live,
  kind:   'join' | 'share' | 'shop_view' | 'cart_add',
  viewer: { workspaceId, name, avatarUrl, isVerified } }

// poll — switch on poll.phase
{ live, poll: { phase: 'started', id, sessionId, question,
                options: [{ id, label }], anonymous, tally, totalVotes,
                expiresAt, startedAt } }
{ live, poll: { phase: 'tally',  sessionId, tally, totalVotes } }
{ live, poll: { phase: 'closed', sessionId, tally, totalVotes, status } }

// gift_goal
{ live, goal: { id, label, isCompleted,
                items: [{ giftId, giftName, giftThumbnailUrl,
                          coinCost, targetQuantity, currentQuantity }] } }
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

## Bundles → effects (`loadPreset` / `applyPreset`)

For **interactive gifts**, instead of a hand-written slug→command switch you can load a
**bundle** and let the connector wire it up — with a per-slot cooldown and safe
placeholder substitution. A bundle is the same `bundle.json` shape used by the
[community bundles repo](https://github.com/houla-community/bundles): each reserved slot
(`ix_slot_01`…`ix_slot_30`) carries an `effect`.

```js
const { HoulaLiveConnection, loadPreset, applyPreset } = require('@houla/live-connector');

const preset = loadPreset('./gaming-fx.bundle.json');   // path OR object OR { slug: {command} } map
const conn = new HoulaLiveConnection({ token: 'hle_...' });

applyPreset(conn, preset, {
  cooldownMs: 1500,                       // default per-slot throttle
  vars: { player: 'Steve' },              // fills {player} in commands
  onCommand: (command, gift) => rcon.send(command),   // YOUR executor
});

conn.connect();
```

Placeholders resolved in commands: `{sender}`, `{quantity}`, `{coins}`, `{name}`, plus any
`vars` you pass (e.g. `{player}`). Untrusted values (the sender name) are sanitized. Gifts are
de-duplicated on `transactionId` by default, and each slot honours its own `cooldownMs`.

### Dry-run without a live — `simulateGift`

Test your effects offline (no live, no coins, no connection). It fires the exact same path as a
real gift:

```js
conn.simulateGift({ slug: 'ix_slot_09', senderName: 'Alice' }); // → your onCommand runs
```

## No terminal — the app (for streamers)

Don't want to touch npm or a terminal? Grab **`houla-connector.exe`** from the
[Releases](https://github.com/Hou-la/houla-live-connector/releases) page (built by CI), then:

1. Unzip → you get `houla-connector.exe`, `houla.config.json` and a sample `bundle.json`.
2. Open `houla.config.json` and paste your key (created in the Studio → *Connecteur live*):
   ```json
   {
     "key": "hle_your_key",
     "vars": { "player": "YourMinecraftName" },
     "rcon": { "host": "127.0.0.1", "port": 25575, "password": "your_rcon_password" }
   }
   ```
   The `rcon` block is **optional** — leave it out to just see gifts logged; add it and gifts fire
   Minecraft commands. A `bundle.json` next to the exe supplies the gift→command mapping.
3. **Double-click the exe.** First run without a config? It asks for your key and saves it. Add it to
   Windows startup so it launches on boot — set-and-forget.

The connector is **optional**: run it only if you want gifts to trigger real effects.

<sub>Build it yourself: `npm run build:exe` (needs pkg's prebuilt fetch or VS build tools), or with
[Bun](https://bun.sh): `bun build bin/houla-connector.js --compile --target=bun-windows-x64 --outfile release/houla-connector.exe`.
CI ([`release-exe.yml`](./.github/workflows/release-exe.yml)) does this on every version tag.</sub>

## Examples

See the [`examples`](./examples) folder.

- [`log.js`](./examples/log.js) prints every gift.
- [`minecraft-rcon.js`](./examples/minecraft-rcon.js) turns a gift into a Minecraft command over RCON — a hand-written slug→command switch.
- [`bundle-effects.js`](./examples/bundle-effects.js) loads a **bundle** preset, applies it with per-slot cooldown, and runs offline via `simulateGift` when no key is set.

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
