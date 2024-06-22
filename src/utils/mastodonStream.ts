import { ref, computed } from "vue";
import { nanoid } from "nanoid/non-secure";
import { ChannelName, MastodonChannelName } from "@shared/types/store";
import { MastodonToot } from "@/types/mastodon";

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

export const channelToMastodonStreaName = (channel: ChannelName): MastodonStreamChannel => {
  switch (channel) {
    case "mastodon:homeTimeline":
      return "user";
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
export const connectToMastodonStream = (
  host: string,
  params: {
    access_token: string;
    stream: MastodonStreamChannel;
    list?: string;
    tag?: string;
  },
) => {
  const wsParams = new URLSearchParams();
  wsParams.append("access_token", params.access_token);
  wsParams.append("stream", params.stream);
  if (params.list) {
    wsParams.append("list", params.list);
  }
  if (params.tag) {
    wsParams.append("tag", params.tag);
  }
  return new WebSocket(`wss://${host}/api/v1/streaming?${wsParams.toString()}`);
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
  onStatusUpdate,
  onDelete,
  onReconnect,
}: {
  onUpdate: (toot: MastodonToot) => void;
  onStatusUpdate: (toot: MastodonToot) => void;
  onDelete: (id: string) => void;
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
  }: {
    host: string;
    token: string;
    channel: MastodonChannelName;
    tag?: string;
    listId?: string;
  }) => {
    if (channel === "mastodon:list" && !listId) return;
    if (channel === "mastodon:hashtag" && !tag) return;

    const streamName = channelToMastodonStreaName(channel);

    shouldConnect.value = true;
    webSocketId.value = nanoid();
    ws = connectToMastodonStream(host, {
      access_token: token,
      stream: streamName,
      list: listId,
      tag,
    });

    ws.onopen = () => {
      console.info("ws:open");
      eventTime.lastOpen = Date.now();

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
          try {
            onUpdate(JSON.parse(data.payload));
          } catch (e) {
            console.error(e);
          }
          break;
        case "status.update":
          try {
            onStatusUpdate(JSON.parse(data.payload));
          } catch (e) {
            console.error(e);
          }
          break;
        case "delete":
          console.info("delete", data.payload);
          onDelete(data.payload);
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

  return { connect, disconnect, state };
};
