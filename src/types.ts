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

/**
 * Public workspace display identity. Events carry ONLY these public fields —
 * a workspace's name, avatar, handle and verified badge — never private data.
 */
export interface PublicIdentity {
  workspaceId: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** Present on comment authors; absent on viewers. */
  slug?: string | null;
  isVerified: boolean;
}

/** Reference to the live an event belongs to. */
export interface LiveRef {
  roomId: string;
  /** The broadcaster's workspace — the creator whose live it is. */
  workspaceId: string;
}

/** The live's running heart total updated (already aggregated, throttled). */
export interface HeartsEvent {
  live: LiveRef;
  totalHearts: number;
}

/** A comment was approved in your live chat. */
export interface CommentEvent {
  live: LiveRef;
  comment: {
    id: string;
    content: string | null;
    parentId: string | null;
    serverSequence: number | null;
    createdAt: string | null;
  };
  /** Public identity of the commenter. */
  author: PublicIdentity;
}

/** A viewer interaction on your live. */
export interface ViewerEvent {
  live: LiveRef;
  kind: 'join' | 'share' | 'shop_view' | 'cart_add';
  /** Public identity of the viewer. */
  viewer: Omit<PublicIdentity, 'slug'>;
}

export interface PollOption {
  id: string;
  label: string;
}
interface PollBase {
  sessionId: string | null;
  tally: Record<string, number>;
  totalVotes: number;
}
export interface PollStarted extends PollBase {
  phase: 'started';
  id: string | null;
  question: string | null;
  options: PollOption[];
  anonymous: boolean;
  expiresAt: string | null;
  startedAt: string | null;
}
export interface PollTally extends PollBase {
  phase: 'tally';
}
export interface PollClosed extends PollBase {
  phase: 'closed';
  status: string | null;
}
/** A poll started, its tally updated, or it closed. Switch on `poll.phase`. */
export interface PollEvent {
  live: LiveRef;
  poll: PollStarted | PollTally | PollClosed;
}

/** A gift-goal's progress advanced (fires once with `isCompleted: true`). */
export interface GiftGoalEvent {
  live: LiveRef;
  goal: {
    id: string | null;
    label: string | null;
    isCompleted: boolean;
    items: Array<{
      giftId: string;
      giftName: string;
      giftThumbnailUrl: string | null;
      coinCost: number;
      targetQuantity: number;
      currentQuantity: number;
    }>;
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
  hearts: (hearts: HeartsEvent) => void;
  comment: (comment: CommentEvent) => void;
  viewer: (viewer: ViewerEvent) => void;
  poll: (poll: PollEvent) => void;
  gift_goal: (goal: GiftGoalEvent) => void;
  /** Fires for every event, whatever its type. Handy for logging. */
  event: (envelope: EventEnvelope) => void;
}
