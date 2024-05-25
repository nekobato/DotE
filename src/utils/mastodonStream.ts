import { ref, computed, onUpdated } from "vue";
import { nanoid } from "nanoid/non-secure";
import { ChannelName, MastodonChannelName } from "@shared/types/store";

export type MastodonStreamChannel =
  | "public"
  | "public:media" // 使ってない
  | "public:local"
  | "public:local:media" // 使ってない
  | "public:remote"
  | "public:remote:media" // 使ってない
  | "hashtag" // 使ってない
  | "hashtag:local"
  | "user" // 使ってない
  | "user:notification"
  | "list"
  | "direct"; // 使ってない

export const channelToMastodonStreamChannel = (channel: ChannelName): MastodonStreamChannel => {
  switch (channel) {
    case "mastodon:homeTimeline":
      return "public";
    case "mastodon:localTimeline":
      return "public:local";
    case "mastodon:publicTimeline":
      return "public";
    case "mastodon:hashtag":
      return "hashtag:local";
    case "mastodon:list":
      return "list";
    case "mastodon:notifications":
      return "user:notification";
    default:
      throw new Error("invalid channel");
  }
};

export const webSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// https://docs.joinmastodon.org/methods/streaming/
export const connectToMastodonStream = (host: string, token: string, type: MastodonStreamChannel) => {
  return new WebSocket(`wss://${host}/api/v1/streaming?access_token=${token}&stream=${type}`);
};

export const disconnectWebSocket = (ws: WebSocket | null) => {
  if (!ws) return;
  ws.close();
  ws.onopen = null;
  ws.onerror = null;
  ws.onclose = null;
  ws.onmessage = null;
  ws = null;
};

export const useMastodonStream = ({
  onUpdate,
  onReconnect,
}: {
  onUpdate: (payload: any) => void;
  onReconnect: () => void;
}) => {
  let ws: WebSocket;
  const shouldConnect = ref(false);
  const wsNoteSubScriptionQueue: string[] = [];
  const webSocketId = ref<string | null>(null);
  const eventTime = {
    lastOpen: 0,
    lastClose: 0,
  };

  const onConnected = () => {
    console.log("ws:connected");
    if (wsNoteSubScriptionQueue.length) {
      wsNoteSubScriptionQueue.forEach((postId) => {
        ws?.send(
          JSON.stringify({
            type: "subNote",
            body: { id: postId },
          }),
        );
      });
      wsNoteSubScriptionQueue.length = 0;
    }
  };

  const connect = ({
    host,
    token,
    channel,
    tag,
    listId,
    query,
  }: {
    host: string;
    token: string;
    channel: MastodonChannelName;
    tag?: string;
    listId?: string;
    query?: string;
  }) => {
    if (channel === "mastodon:list" && !listId) return;
    if (channel === "mastodon:hashtag" && !tag) return;

    const streamChannel = channelToMastodonStreamChannel(channel);

    shouldConnect.value = true;
    webSocketId.value = nanoid();
    ws = connectToMastodonStream(host, token, streamChannel);

    ws.onopen = () => {
      console.info("ws:open");
      eventTime.lastOpen = Date.now();

      ws?.send(
        JSON.stringify({
          type: "connect",
          body: {
            channel,
            id: webSocketId.value,
            params: {
              ...(channel === "mastodon:list" ? { listId } : {}),
              ...(channel === "mastodon:hashtag" ? { tag } : {}),
              ...(query ? { query } : {}),
            },
          },
        }),
      );
      if (eventTime.lastClose) {
        onReconnect();
      }
    };

    ws.onerror = () => {
      console.error("ws:error");
    };

    ws.onclose = () => {
      console.info("ws:close");
      eventTime.lastClose = Date.now();
      if (shouldConnect.value) {
        setTimeout(() => {
          connect({ host, token, channel });
        }, 1000);
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.event) {
        case "connected":
          onConnected();
          break;
        case "update":
          console.info("update", data);
          onUpdate(data.payload);
          break;
        default:
          console.info("unhandled stream message", data);
          break;
      }
    };
  };

  const disconnect = () => {
    shouldConnect.value = false;
    disconnectWebSocket(ws);
  };

  const state = computed(() => ws?.readyState);

  const subNote = (postId: string) => {
    if (state.value === webSocketState.OPEN) {
      ws?.send(
        JSON.stringify({
          type: "subNote",
          body: { id: postId },
        }),
      );
    } else {
      wsNoteSubScriptionQueue.push(postId);
    }
  };

  const unsubNote = (postId: string) => {
    if (state.value === webSocketState.OPEN) {
      ws?.send(
        JSON.stringify({
          type: "unsubNote",
          body: { id: postId },
        }),
      );
    }
  };

  return { connect, disconnect, state, subNote, unsubNote, subNoteQueue: wsNoteSubScriptionQueue };
};
