import type { MisskeyNote } from "@shared/types/misskey";
import { computed, ref } from "vue";
import { nanoid } from "nanoid/non-secure";
import { useWebSocket } from "@vueuse/core";

export const webSocketState = {
  CONNECTING: "CONNECTING",
  OPEN: "OPEN",
  CLOSING: "CLOSING",
  CLOSED: "CLOSED",
} as const;

const buildMisskeyStreamUrl = (host: string, token: string) => `wss://${host}/streaming?i=${token}`;

// https://github.com/misskey-dev/misskey/blob/master/packages/backend/src/server/api/stream/ChannelsService.ts
export type MisskeyStreamChannel =
  | "globalTimeline"
  | "homeTimeline"
  | "hybridTimeline"
  | "localTimeline"
  | "userList"
  | "hashtag"
  | "antenna"
  | "channel";

export type MisskeyStreamMessage = {
  id: string;
  type: "note";
  body: MisskeyNote;
};

type ConnectOptions = {
  host: string;
  token: string;
  channel: MisskeyStreamChannel;
  channelId?: string;
  antennaId?: string;
  tag?: string;
  listId?: string;
  query?: string;
};

export const useMisskeyStream = ({
  onChannel,
  onNoteUpdated,
  onEmojiAdded,
  onReconnect,
}: {
  onChannel: (event: string, data: any) => void;
  onNoteUpdated: (event: string, data: any) => void;
  onEmojiAdded: (event: string, data: any) => void;
  onReconnect: () => void;
}) => {
  const shouldReconnect = ref(false);
  const reconnecting = ref(false);
  const webSocketId = ref<string | null>(null);
  const subscriptionQueue: string[] = [];
  const url = ref<string>();
  const lastConnectOptions = ref<ConnectOptions | null>(null);

  const { status, send, open, close } = useWebSocket(url, {
    immediate: false,
    autoConnect: false,
    autoReconnect: {
      retries: () => shouldReconnect.value,
      delay: 500,
    },
    onConnected() {
      const options = lastConnectOptions.value;
      if (!options) return;

      send(
        JSON.stringify({
          type: "connect",
          body: {
            channel: options.channel,
            id: webSocketId.value,
            params: {
              ...(options.channel === "channel" ? { channelId: options.channelId } : {}),
              ...(options.channel === "antenna" ? { antennaId: options.antennaId } : {}),
              ...(options.channel === "userList" ? { listId: options.listId } : {}),
              ...(options.channel === "hashtag" ? { tag: options.tag } : {}),
              ...(options.query ? { query: options.query } : {}),
            },
          },
        }),
      );

      if (reconnecting.value) {
        reconnecting.value = false;
        onReconnect();
      }
    },
    onDisconnected() {
      if (shouldReconnect.value) {
        reconnecting.value = true;
      } else {
        reconnecting.value = false;
      }
    },
    onError(_, error) {
      console.error("ws:error", error);
    },
    onMessage(_, event) {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "connected":
            console.log("ws:connected");
            handleServerConnected();
            break;
          case "channel":
            onChannel(data.body.type, data.body);
            break;
          case "noteUpdated":
            onNoteUpdated(data.body.type, data.body);
            break;
          case "emojiAdded":
            onEmojiAdded(data.body.type, data.body);
            break;
          default:
            console.info("unhandled stream message", data);
            break;
        }
      } catch (error) {
        console.error("ws:message parse error", error);
      }
    },
  });

  const handleServerConnected = () => {
    if (!subscriptionQueue.length) return;
    subscriptionQueue.forEach((postId) => {
      send(
        JSON.stringify({
          type: "subNote",
          body: { id: postId },
        }),
      );
    });
    subscriptionQueue.length = 0;
  };

  const connect = ({
    host,
    token,
    channel,
    channelId,
    antennaId,
    tag,
    listId,
    query,
  }: ConnectOptions) => {
    if (channel === "channel" && !channelId) return;
    if (channel === "antenna" && !antennaId) return;
    if (channel === "userList" && !listId) return;
    if (channel === "hashtag" && !tag) return;

    shouldReconnect.value = true;
    reconnecting.value = false;
    webSocketId.value = nanoid();
    lastConnectOptions.value = {
      host,
      token,
      channel,
      channelId,
      antennaId,
      tag,
      listId,
      query,
    };
    url.value = buildMisskeyStreamUrl(host, token);
    open();
  };

  const disconnect = () => {
    shouldReconnect.value = false;
    reconnecting.value = false;
    lastConnectOptions.value = null;
    close();
  };

  const state = computed(() => status.value);

  const subNote = (postId: string) => {
    if (state.value === webSocketState.OPEN) {
      send(
        JSON.stringify({
          type: "subNote",
          body: { id: postId },
        }),
      );
    } else {
      subscriptionQueue.push(postId);
    }
  };

  const unsubNote = (postId: string) => {
    if (state.value === webSocketState.OPEN) {
      send(
        JSON.stringify({
          type: "unsubNote",
          body: { id: postId },
        }),
      );
    }
  };

  return { connect, disconnect, state, subNote, unsubNote, subNoteQueue: subscriptionQueue };
};
