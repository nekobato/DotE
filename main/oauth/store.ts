import type { NodeSavedSessionStore, NodeSavedState, NodeSavedStateStore } from "@atproto/oauth-client-node";
import { deleteBlueskyOAuthSession, getBlueskyOAuthSession, setBlueskyOAuthSession } from "../db";

const stateMap = new Map<string, NodeSavedState>();

export const blueskyStateStore: NodeSavedStateStore = {
  async set(key, value) {
    stateMap.set(key, value);
  },
  async get(key) {
    return stateMap.get(key);
  },
  async del(key) {
    stateMap.delete(key);
  },
  async clear() {
    stateMap.clear();
  },
};

export const blueskySessionStore: NodeSavedSessionStore = {
  async set(sub, session) {
    await setBlueskyOAuthSession(sub, session);
  },
  async get(sub) {
    const stored = getBlueskyOAuthSession(sub);
    if (!stored) return undefined;
    const { updatedAt: _updatedAt, ...session } = stored;
    return session;
  },
  async del(sub) {
    deleteBlueskyOAuthSession(sub);
  },
};
