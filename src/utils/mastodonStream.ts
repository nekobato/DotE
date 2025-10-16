import { computed, ref } from "vue";
import { useWebSocket } from "@vueuse/core";
import { ChannelName, MastodonChannelName } from "@shared/types/store";
import { MastodonToot } from "@/types/mastodon";

export type MastodonStreamChannel =
  | "public"
  | "public:media"
  | "public:local"
  | "public:local:media"
  | "public:remote"
  | "public:remote:media"
  | "hashtag"
  | "hashtag:local"
  | "user"
  | "user:notification"
  | "list"
  | "direct";

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
  CONNECTING: "CONNECTING",
  OPEN: "OPEN",
  CLOSING: "CLOSING",
  CLOSED: "CLOSED",
} as const;

const buildMastodonStreamUrl = (
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
  return `wss://${host}/api/v1/streaming?${wsParams.toString()}`;
};

type ConnectOptions = {
  host: string;
  token: string;
  channel: MastodonChannelName;
  tag?: string;
  listId?: string;
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
  const shouldReconnect = ref(false);
  const reconnecting = ref(false);
  const url = ref<string>();

  const { status, open, close } = useWebSocket(url, {
    immediate: false,
    autoConnect: false,
    autoReconnect: {
      retries: () => shouldReconnect.value,
      delay: 1000,
    },
    onConnected() {
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
        switch (data.event) {
          case "connected":
            console.log("ws:connected");
            break;
          case "update":
            onUpdate(JSON.parse(data.payload));
            break;
          case "status.update":
            onStatusUpdate(JSON.parse(data.payload));
            break;
          case "delete":
            console.info("delete", data.payload);
            onDelete(data.payload);
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

  const connect = ({ host, token, channel, tag, listId }: ConnectOptions) => {
    if (channel === "mastodon:list" && !listId) return;
    if (channel === "mastodon:hashtag" && !tag) return;

    const streamName = channelToMastodonStreaName(channel);

    shouldReconnect.value = true;
    reconnecting.value = false;
    url.value = buildMastodonStreamUrl(host, {
      access_token: token,
      stream: streamName,
      list: listId,
      tag,
    });
    open();
  };

  const disconnect = () => {
    shouldReconnect.value = false;
    reconnecting.value = false;
    close();
  };

  const state = computed(() => status.value);

  return { connect, disconnect, state };
};
