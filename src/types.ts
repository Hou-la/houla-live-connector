/** Event types you can receive. Matches the types you select when you create a key. */
export type EventType =
  | 'gift'
  | 'hearts'
  | 'comment'
  | 'viewer'
  | 'poll'
  | 'gift_goal';

/** The envelope every event is wrapped in. */
export interface EventEnvelope<T = unknown> {
  /** Semantic event name, e.g. "live.gift_received". */
  event: string;
  /** Short type, matches EventType. Use this to route. */
  type: EventType;
  /** ISO 8601 timestamp set by the server. */
  timestamp: string;
  /** The event body. Shape depends on `type`. */
  data: T;
}

/** A gift received on one of your lives. */
export interface GiftEvent {
  /**
   * Unique id of the underlying transaction. Use it to de-duplicate: the same
   * gift can reach you more than once on a reconnect, and you do not want to
   * fire an in-game action twice.
   */
  transactionId: string | null;
  live: {
    roomId: string;
    workspaceId: string;
  };
  gift: {
    id: string;
    slug: string;
    name: string;
    category: string | null;
    /** Price of a single unit, in coins. */
    coinCost: number;
    /** How many were sent at once. */
    quantity: number;
    /** Total coins actually spent (the value that was debited). */
    totalCoins: number;
    /** Stars the creator earned from this gift. */
    totalStars: number;
    /** Absolute image URL, or null. */
    thumbnailUrl: string | null;
    animationDurationMs: number | null;
  };
  sender: {
    workspaceId: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
}

/** Payload sent with the `connected` event once the key is accepted. */
export interface ReadyInfo {
  workspaceId: string;
  events: EventType[];
}

export interface ConnectorOptions {
  /** Your event key, created in the Hou.la studio. Starts with `hle_`. */
  token: string;
  /**
   * Base URL of the Hou.la API. Defaults to the public endpoint. Override it
   * only for local development against your own instance.
   */
  url?: string;
  /** Reconnect automatically when the connection drops. Defaults to true. */
  reconnect?: boolean;
}

/** Maps each event name to the shape of its callback argument. */
export interface ConnectorEvents {
  connected: (info: ReadyInfo) => void;
  disconnected: (reason: string) => void;
  error: (error: Error) => void;
  gift: (gift: GiftEvent) => void;
  /** Fires for every event, whatever its type. Handy for logging. */
  event: (envelope: EventEnvelope) => void;
}
