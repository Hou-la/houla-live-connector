import { readFileSync } from 'fs';
import { HoulaLiveConnection } from './client';
import { GiftEvent } from './types';

/** One reserved slot's effect, from a bundle.json slot (or a plain preset). */
export interface PresetEntry {
  /** The reserved slot slug this effect fires on (ix_slot_01..30). */
  slug: string;
  type?: 'rcon' | 'obs' | 'http' | 'custom';
  /** The command to run. `template` is an alias for `command`. */
  command?: string;
  template?: string;
  /** Minimum ms between two firings of THIS slot (anti-flood). */
  cooldownMs?: number;
}

/** A normalized slot → effect map, keyed by slot slug. */
export type EffectPreset = Record<string, PresetEntry>;

/**
 * Load an effect preset from a bundle.json (object OR filesystem path) or a
 * plain `{ slug -> entry }` map. Returns a normalized map keyed by slot slug.
 *
 * A `bundle.json` is `{ slots: [{ slug, name, image, effect }] }` — the VISUAL
 * fields (name, image) are ignored; only each slot's `effect` is kept.
 */
export function loadPreset(source: string | object): EffectPreset {
  let raw: any = source;
  if (typeof source === 'string') {
    raw = JSON.parse(readFileSync(source, 'utf8'));
  }

  const preset: EffectPreset = {};
  const add = (slug: string, effect: any) => {
    if (!slug || !effect) return;
    preset[slug] = {
      slug,
      type: effect.type,
      command: effect.command,
      template: effect.template,
      cooldownMs: effect.cooldownMs,
    };
  };

  if (Array.isArray(raw?.slots)) {
    for (const slot of raw.slots) add(slot?.slug, slot?.effect);
  } else if (raw && typeof raw === 'object') {
    for (const [slug, entry] of Object.entries<any>(raw)) {
      add(slug, entry?.effect ? entry.effect : entry);
    }
  }
  return preset;
}

export interface ApplyPresetOptions {
  /** Called with the resolved command + the gift, for YOU to execute (rcon,
   *  OBS websocket, HTTP…). Return a promise to serialize effects if you like. */
  onCommand: (command: string, gift: GiftEvent) => void | Promise<void>;
  /** Default per-slot cooldown (ms) when a slot has no `cooldownMs`. */
  cooldownMs?: number;
  /** De-duplicate by transactionId (reconnects can re-deliver). Default true. */
  dedup?: boolean;
  /** Extra template vars, e.g. `{ player: 'Steve' }` for `{player}`. */
  vars?: Record<string, string | number>;
}

/** Strip anything risky from a substituted (untrusted) value like the sender name. */
function sanitize(v: unknown): string {
  return String(v ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[;`$|&<>"'\\]/g, '')
    .slice(0, 60)
    .trim();
}

function resolve(
  template: string,
  gift: GiftEvent,
  vars?: Record<string, string | number>,
): string {
  const map: Record<string, string> = {
    sender: sanitize(gift.sender?.name),
    quantity: String(gift.gift?.quantity ?? 1),
    coins: String(gift.gift?.totalCoins ?? 0),
    name: sanitize(gift.gift?.name),
  };
  for (const [k, v] of Object.entries(vars ?? {})) map[k] = sanitize(v);
  // Leave unknown {tokens} untouched so a typo is visible, not silently blanked.
  return template.replace(/\{(\w+)\}/g, (_m, k) => (k in map ? map[k] : `{${k}}`));
}

/**
 * Wire a preset to your effect executor. On each `gift`, if the gift's slot is
 * in the preset (and its per-slot cooldown has elapsed), resolve the command
 * template and call `onCommand`. Placeholders: `{sender}`, `{quantity}`,
 * `{coins}`, `{name}`, plus any `vars` you pass (e.g. `{player}`); untrusted
 * values are sanitized. De-dups on `transactionId` by default.
 *
 * Returns an unsubscribe function.
 */
export function applyPreset(
  conn: HoulaLiveConnection,
  preset: EffectPreset,
  opts: ApplyPresetOptions,
): () => void {
  const dedup = opts.dedup !== false;
  const seen = new Set<string>();
  const lastFired = new Map<string, number>();

  const handler = async (gift: GiftEvent) => {
    const slug = gift?.gift?.slug;
    const entry = slug ? preset[slug] : undefined;
    if (!entry) return;

    if (dedup && gift.transactionId) {
      if (seen.has(gift.transactionId)) return;
      seen.add(gift.transactionId);
    }

    const cooldown = entry.cooldownMs ?? opts.cooldownMs ?? 0;
    if (cooldown > 0) {
      const now = Date.now();
      if (now - (lastFired.get(slug) ?? 0) < cooldown) return;
      lastFired.set(slug, now);
    }

    const template = entry.command ?? entry.template;
    if (!template) return;

    await opts.onCommand(resolve(template, gift, opts.vars), gift);
  };

  conn.on('gift', handler);
  return () => conn.off('gift', handler);
}
