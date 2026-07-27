import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import {
  ConnectorEvents,
  ConnectorOptions,
  EventEnvelope,
  EventType,
  GiftEvent,
} from './types';

const DEFAULT_URL = 'https://api.hou.la';
const NAMESPACE = '/events';
const SOCKET_PATH = '/ws';

/**
 * Connects to the Hou.la event channel with a key and re-emits the live events
 * of your workspace as plain Node events. Listen with `.on('gift', ...)`.
 *
 * The key is read-only. It cannot post, spend or change anything. It only lets
 * you receive the events you selected when you created it.
 */
export class HoulaLiveConnection extends EventEmitter {
  private socket?: Socket;
  private readonly token: string;
  private readonly url: string;
  private readonly reconnect: boolean;

  constructor(options: ConnectorOptions) {
    super();
    if (!options?.token) {
      throw new Error('A token is required. Create one in the Hou.la studio.');
    }
    this.token = options.token;
    this.url = (options.url ?? DEFAULT_URL).replace(/\/+$/, '');
    this.reconnect = options.reconnect !== false;
  }

  /** Open the connection. Returns the instance so you can chain. */
  connect(): this {
    if (this.socket) return this;

    this.socket = io(`${this.url}${NAMESPACE}`, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      auth: { token: this.token },
      reconnection: this.reconnect,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('ready', (info) => this.emit('connected', info));

    // The server sends a short string reason ("INVALID_KEY", "RATE_LIMITED",
    // "TOO_MANY_CONNECTIONS") before closing the socket on a rejected key.
    this.socket.on('error', (reason: string) =>
      this.emit('error', new Error(String(reason))),
    );

    this.socket.on('connect_error', (err) =>
      this.emit('error', err instanceof Error ? err : new Error(String(err))),
    );

    this.socket.on('disconnect', (reason) =>
      this.emit('disconnected', String(reason)),
    );

    // Every live event arrives on a single channel, wrapped in an envelope.
    // Re-emit it under its own type so callers can do `.on('gift', ...)`.
    this.socket.on('event', (envelope: EventEnvelope) => {
      if (!envelope || typeof envelope.type !== 'string') return;
      this.emit('event', envelope);
      this.emit(envelope.type as EventType, envelope.data);
    });

    return this;
  }

  /** Close the connection and stop reconnecting. */
  disconnect(): void {
    this.socket?.close();
    this.socket = undefined;
  }

  /** True while the underlying socket is connected. */
  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Locally emit a synthetic `gift` (and `event`) for SANDBOX testing — no
   * live, no coins, no connection required. It mirrors the exact real dispatch
   * path, so your `applyPreset` / `on('gift', …)` handlers fire identically.
   * Handy to dry-run a bundle's effects before going live.
   */
  simulateGift(opts: {
    slug: string;
    quantity?: number;
    coinCost?: number;
    senderName?: string;
  }): GiftEvent {
    const quantity = opts.quantity ?? 1;
    const coinCost = opts.coinCost ?? 0;
    const gift: GiftEvent = {
      transactionId: `sim_${Date.now()}`,
      live: { roomId: 'sim', workspaceId: 'sim' },
      gift: {
        id: 'sim',
        slug: opts.slug,
        name: opts.slug,
        category: null,
        coinCost,
        quantity,
        totalCoins: coinCost * quantity,
        totalStars: coinCost * quantity,
        thumbnailUrl: null,
        animationDurationMs: null,
      },
      sender: {
        workspaceId: null,
        name: opts.senderName ?? 'Sandbox',
        avatarUrl: null,
      },
    };
    const envelope: EventEnvelope<GiftEvent> = {
      event: 'live.gift_received',
      type: 'gift',
      timestamp: new Date().toISOString(),
      data: gift,
    };
    this.emit('gift', gift);
    this.emit('event', envelope);
    return gift;
  }

  // Typed overloads over Node's EventEmitter so editors autocomplete the
  // payloads. Falls back to the untyped signature for anything else.
  on<K extends keyof ConnectorEvents>(event: K, listener: ConnectorEvents[K]): this;
  on(event: string, listener: (...args: any[]) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  once<K extends keyof ConnectorEvents>(event: K, listener: ConnectorEvents[K]): this;
  once(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  off<K extends keyof ConnectorEvents>(event: K, listener: ConnectorEvents[K]): this;
  off(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }
}
