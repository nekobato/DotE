import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import { deleteBlueskyOAuthSession, getBlueskyOAuthSession, setBlueskyOAuthSession } from "../db";

const stateMap = new Map<string, NodeSavedState>();

export const blueskyStateStore: NodeSavedStateStore = {
  async set(key: string, value: NodeSavedState) {
    stateMap.set(key, value);
  },
  async get(key: string) {
    return stateMap.get(key);
  },
  async del(key: string) {
    stateMap.delete(key);
  },
  async clear() {
    stateMap.clear();
  },
};

export const blueskySessionStore: NodeSavedSessionStore = {
  async set(sub: string, session: NodeSavedSession) {
    await setBlueskyOAuthSession(sub, session);
  },
  async get(sub: string) {
    const stored = getBlueskyOAuthSession(sub);
    if (!stored) return undefined;
    const { updatedAt: _updatedAt, ...session } = stored;
    return session;
  },
  async del(sub: string) {
    deleteBlueskyOAuthSession(sub);
  },
};
