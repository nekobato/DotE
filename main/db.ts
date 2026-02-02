import { safeStorage } from "electron";
import Store, { Schema, type Options as StoreOptions } from "electron-store";
import { nanoid } from "nanoid/non-secure";
import type { NodeSavedSession } from "@atproto/oauth-client-node";
import type { Instance, Timeline, User, Settings, InstanceType } from "../shared/types/store";
import { BLUESKY_CLIENT_ID, BLUESKY_SCOPE } from "../shared/bluesky-oauth";
import { APP_LOOPBACK_REDIRECT_URI, BLUESKY_CUSTOM_REDIRECT_URI } from "./oauth/constants";

export type StoreSchema = {
  timelines: Timeline[];
  instances: Instance[];
  users: User[];
  settings: Settings;
  blueskySessions: Record<string, string>;
};

export type BlueskyOAuthConfig = {
  clientId: string;
  redirectUri: string;
  scope: string;
};

const DEFAULT_BLUESKY_CLIENT_ID = BLUESKY_CLIENT_ID;
const DEFAULT_BLUESKY_REDIRECT_URI = BLUESKY_CUSTOM_REDIRECT_URI;
const DEFAULT_BLUESKY_SCOPE = BLUESKY_SCOPE;
const DEFAULT_BLUESKY_FALLBACK_REDIRECT_URI = APP_LOOPBACK_REDIRECT_URI;
const LEGACY_BLUESKY_REDIRECT_URI_PREFIX = "daydream-of-the-elephants:";

/**
 * Normalize Bluesky OAuth redirect URI to the current, spec-compliant custom scheme.
 * Legacy values are upgraded eagerly so persisted settings cannot keep the app broken.
 */
const normalizeBlueskyRedirectUri = (value?: string): string => {
  if (!value || value.startsWith(LEGACY_BLUESKY_REDIRECT_URI_PREFIX)) {
    return BLUESKY_CUSTOM_REDIRECT_URI;
  }
  return value;
};

export const storeDefaults: StoreSchema = {
  users: [],
  instances: [],
  timelines: [],
  settings: {
    opacity: 50,
    mode: "show",
    font: {
      family: "",
    },
    windowSize: {
      width: 475,
      height: 600,
    },
    maxPostCount: 500,
    postStyle: "all",
    shortcuts: {
      toggleTimeline: "Ctrl+Alt+x",
    },
    text2Speech: {
      enabled: false,
      rate: 1,
      pitch: 1,
      volume: 1,
      voice: "Kyoko",
      hookUrl: "",
    },
    misskey: {
      hideCw: false,
      showReactions: true,
    },
  },
  blueskySessions: {},
};

const schema: Schema<StoreSchema> = {
  timelines: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        userId: { type: "string" },
        channel: { type: "string" },
        options: {
          type: "object",
          properties: {
            channelId: { type: "string" },
            listId: { type: "string" },
            antennaId: { type: "string" },
            tag: { type: "string" },
            query: { type: "string" },
          },
        },
        updateInterval: { type: "number" },
        available: { type: "boolean" },
        lastReadId: { type: "string" },
        lastReadAt: { type: "string" },
      },
      required: ["id", "userId", "channel", "available"],
    },
  },
  instances: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { type: "string" },
        name: { type: "string" },
        url: { type: "string" },
        iconUrl: { type: "string" },
      },
      required: ["id", "type", "name", "url", "iconUrl"],
    },
  },
  users: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        instanceId: { type: "string" },
        name: { type: "string" },
        token: { type: "string" },
        refreshToken: { type: "string" },
        avatarUrl: { type: "string" },
        blueskySession: { type: "object" },
      },
      required: ["id", "instanceId", "name", "token", "avatarUrl"],
    },
  },
  settings: {
    type: "object",
    properties: {
      opacity: { type: "number" },
      mode: { type: "string" },
      font: {
        type: "object",
        properties: {
          family: { type: "string" },
        },
      },
      windowSize: {
        type: "object",
        properties: {
          width: { type: "number" },
          height: { type: "number" },
        },
      },
      maxPostCount: { type: "number" },
      postStyle: { type: "string" },
      shortcuts: {
        type: "object",
        properties: {
          toggleTimeline: { type: "string" },
        },
      },
      misskey: {
        type: "object",
        properties: {
          hideCw: { type: "boolean" },
          showReactions: { type: "boolean" },
        },
      },
      bluesky: {
        type: "object",
        properties: {
          oauth: {
            type: "object",
            properties: {
              clientId: { type: "string" },
              redirectUri: { type: "string" },
              scope: { type: "string" },
            },
          },
        },
      },
    },
  },
  blueskySessions: {
    type: "object",
    additionalProperties: {
      type: "string",
    },
    default: {},
  },
};

type StoreInitOptions = StoreOptions<StoreSchema> & {
  projectName: string;
};

const storeInitOptions: StoreInitOptions = {
  name: "dote",
  schema,
  defaults: storeDefaults,
  clearInvalidConfig: true,
  projectName: "DotE",
  migrations: {
    "0.0.21": (store) => {
      const settings = store.get("settings") as StoreSchema["settings"] | undefined;
      if (!settings || typeof settings !== "object") {
        store.set("settings", storeDefaults.settings);
        return;
      }
    },
  },
};

export const store = new Store<StoreSchema>(storeInitOptions);

// Actions

// Timeline

export const getTimelineAll = () => {
  return store.get("timelines");
};

export const setTimeline = (data: Timeline) => {
  if (!data.userId) throw new Error("userId is required");
  if (!data.channel) throw new Error("channel is required");
  if (!data.options) throw new Error("options is required");

  if (data.id) {
    store.set(
      "timelines",
      store.get("timelines").map((timeline) => {
        if (timeline.id === data.id) {
          return data;
        } else {
          return timeline;
        }
      }),
    );
    return data;
  } else {
    const newTimeline = {
      ...data,
      id: nanoid(),
    };
    store.set("timelines", [...store.get("timelines"), newTimeline]);
    return newTimeline;
  }
};

export const deleteTimeline = (id: string) => {
  if (!id) throw new Error("id is required");

  store.set(
    "timelines",
    store.get("timelines").filter((timeline) => timeline.id !== id),
  );

  const newTimelines = store.get("timelines");

  // すべてのTimelineがavailableならば最初のTimelineをavailableにする
  if (!newTimelines.some((timeline) => timeline.available)) {
    store.set("timelines", [...newTimelines, { ...newTimelines[0], available: true }]);
  }
};

// Instance

export const getInstanceAll = () => {
  return store.get("instances");
};

export const upsertInstance = (instance: {
  id?: string;
  type: InstanceType;
  name: string;
  url: string;
  iconUrl?: string;
}) => {
  const { id, type, name, url, iconUrl } = instance;

  if (!type) throw new Error("type is required");
  if (!name) throw new Error("name is required");
  if (!url) throw new Error("url is required");

  if (id) {
    store.set(
      "instances",
      store.get("instances").map((instance) => {
        if (instance.id === id) {
          return {
            id: id,
            type: type,
            name: name,
            url: url,
            iconUrl: iconUrl,
          };
        } else {
          return instance;
        }
      }),
    );

    return instance;
  } else {
    const newInstance = {
      id: nanoid(),
      type: type,
      name: name,
      url: url,
      iconUrl: iconUrl,
    };
    store.set("instances", [...store.get("instances"), newInstance]);

    return newInstance;
  }
};

export const deleteInstance = (id: string) => {
  if (!id) throw new Error("id is required");

  return store.set(
    "instances",
    store.get("instances").filter((instance) => instance.id !== id),
  );
};

// User

export const deleteUser = (id: string) => {
  if (!id) throw new Error("id is required");

  return store.set(
    "users",
    store.get("users").filter((user) => user.id !== id),
  );
};

export const getUserAll = () => {
  return store.get("users").map((user) => {
    user.token = safeStorage.decryptString(Buffer.from(user.token, "base64"));

    const sessionLike = user.blueskySession as unknown as Record<string, unknown> | undefined;
    if (sessionLike && "accessJwt" in sessionLike) {
      user.blueskySession = undefined;
    }

    return user;
  });
};

export const upsertUser = (user: {
  id?: string;
  instanceId: string;
  name: string;
  token: string;
  avatarUrl: string;
  blueskySession?: User["blueskySession"];
}) => {
  const encryptedToken = safeStorage.encryptString(user.token).toString("base64");

  if (user.id) {
    const currentUser = store.get("users").find((user) => user.instanceId === user.instanceId);
    if (!currentUser) throw new Error("User is not found");
    const { id, token, ...newUserData } = user;
    store.set(
      "users",
      store.get("users").map((user) => {
        if (user.id === currentUser.id) {
          return {
            ...currentUser,
            ...newUserData,
            token: encryptedToken,
          };
        } else {
          return user;
        }
      }),
    );
    return {
      ...currentUser,
      ...newUserData,
      token: encryptedToken,
      ...(user.blueskySession ? { blueskySession: user.blueskySession } : {}),
    };
  } else {
    const newUser = {
      id: nanoid(),
      instanceId: user.instanceId,
      name: user.name,
      token: encryptedToken,
      avatarUrl: user.avatarUrl,
      ...(user.blueskySession ? { blueskySession: user.blueskySession } : {}),
    };
    store.set("users", [...store.get("users"), newUser]);
    return newUser;
  }
};

type PersistedBlueskySession = NodeSavedSession & {
  updatedAt: string;
};

const encryptJson = (value: unknown) => {
  const text = JSON.stringify(value);
  return safeStorage.encryptString(text).toString("base64");
};

const decryptJson = <T>(encoded: string): T => {
  const decrypted = safeStorage.decryptString(Buffer.from(encoded, "base64"));
  return JSON.parse(decrypted) as T;
};

export const setBlueskyOAuthSession = (did: string, session: NodeSavedSession) => {
  if (!did) throw new Error("did is required");
  const storeValue: PersistedBlueskySession = {
    ...session,
    updatedAt: new Date().toISOString(),
  };
  const encoded = encryptJson(storeValue);
  const all = store.get("blueskySessions");
  store.set("blueskySessions", { ...all, [did]: encoded });
};

export const getBlueskyOAuthSession = (did: string): PersistedBlueskySession | undefined => {
  if (!did) throw new Error("did is required");
  const encoded = store.get("blueskySessions")[did];
  if (!encoded) return undefined;
  return decryptJson<PersistedBlueskySession>(encoded);
};

export const deleteBlueskyOAuthSession = (did: string) => {
  if (!did) throw new Error("did is required");
  const sessions = { ...store.get("blueskySessions") };
  delete sessions[did];
  store.set("blueskySessions", sessions);
};

// Setting

export const getSettingAll = (): StoreSchema["settings"] => {
  const settings = store.get("settings") as Partial<StoreSchema["settings"]> | undefined;
  return {
    ...storeDefaults.settings,
    ...(settings ?? {}),
  };
};

export const getSetting = (key: "opacity" | "mode") => {
  if (!key) throw new Error("key is required");

  switch (key) {
    case "opacity":
      return store.get("settings.opacity");
    case "mode":
      return store.get("settings.mode");
    default:
      throw new Error(`${key} is not defined key.`);
  }
};

export const setSetting = (key: string, value: any) => {
  if (!key) throw new Error("key is required");
  if (value === undefined) throw new Error("value is required");

  switch (key) {
    case "opacity":
      return store.set("settings.opacity", Number(value));
    case "mode":
      return store.set("settings.mode", value);
    case "windowSize":
      return store.set("settings.windowSize", value);
    case "font.family":
      return store.set("settings.font.family", value);
    case "maxPostCount":
      return store.set("settings.maxPostCount", Number(value));
    case "shortcuts.toggleTimeline":
      return store.set("settings.shortcuts.toggleTimeline", value);
    case "postStyle":
      return store.set("settings.postStyle", value);
    case "misskey.hideCw":
      return store.set("settings.misskey.hideCw", value);
    case "misskey.showReactions":
      return store.set("settings.misskey.showReactions", value);
    case "text2Speech.enabled":
      return store.set("settings.text2Speech.enabled", value);
    default:
      throw new Error(`${key} is not defined key.`);
  }
};

export const getBlueskyOAuthConfig = (): BlueskyOAuthConfig => {
  return {
    clientId: DEFAULT_BLUESKY_CLIENT_ID,
    redirectUri: normalizeBlueskyRedirectUri(DEFAULT_BLUESKY_REDIRECT_URI),
    scope: DEFAULT_BLUESKY_SCOPE,
  };
};

export const getBlueskyLoopbackRedirectUri = () => DEFAULT_BLUESKY_FALLBACK_REDIRECT_URI;
