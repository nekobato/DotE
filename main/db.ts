import { safeStorage } from "electron";
import Store, { Schema } from "electron-store";
import { nanoid } from "nanoid/non-secure";
import type { Instance, Timeline, User, Settings } from "../shared/types/store";

export type StoreSchema = {
  timelines: Timeline[];
  instances: Instance[];
  users: User[];
  settings: Settings;
};

export const storeDefaults: StoreSchema = {
  users: [],
  instances: [],
  timelines: [],
  settings: {
    opacity: 50,
    mode: "show",
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
      },
      required: ["id", "instanceId", "name", "token", "avatarUrl"],
    },
  },
  settings: {
    type: "object",
    properties: {
      opacity: { type: "number" },
      mode: { type: "string" },
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
    },
  },
};

export const store = new Store<StoreSchema>({
  name: "dote",
  schema,
  defaults: storeDefaults,
  clearInvalidConfig: true,
});

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

  return store.set(
    "timelines",
    store.get("timelines").filter((timeline) => timeline.id !== id),
  );
};

// Instance

export const getInstanceAll = () => {
  return store.get("instances");
};

export const upsertInstance = (instance: {
  id?: string;
  type: "misskey" | "mastodon";
  name: string;
  url: string;
  iconUrl: string;
}) => {
  const { id, type, name, url, iconUrl } = instance;

  if (!type) throw new Error("type is required");
  if (!name) throw new Error("name is required");
  if (!url) throw new Error("url is required");
  if (!iconUrl) throw new Error("iconUrl is required");

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
    console.log("users", user.name);
    const decryptedToken = safeStorage.decryptString(Buffer.from(user.token, "base64"));
    return {
      ...user,
      token: decryptedToken,
    };
  });
};

export const upsertUser = (user: {
  id?: string;
  instanceId: string;
  name: string;
  token: string;
  avatarUrl: string;
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
    };
  } else {
    const newUser = {
      id: nanoid(),
      instanceId: user.instanceId,
      name: user.name,
      token: encryptedToken,
      avatarUrl: user.avatarUrl,
    };
    store.set("users", [...store.get("users"), newUser]);
    return newUser;
  }
};

// Setting

export const getSettingAll = (): StoreSchema["settings"] => {
  return store.get("settings");
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
