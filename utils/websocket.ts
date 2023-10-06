import { MisskeyNote } from "@/types/misskey";
import { nanoid } from "nanoid/non-secure";

export const webSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// https://misskey-hub.net/docs/api/streaming/channel/
export type MisskeyStreamChannel = "globalTimeline" | "homeTimeline" | "hybridTimeline" | "localTimeline" | "main";

export type MisskeyStreamMessage = {
  id: string;
  type: "note";
  body: MisskeyNote;
};

// https://misskey-hub.net/docs/api/streaming
export const connectToMisskeyStream = (
  host: string,
  token: string,
  // id: string,
  // channel: MisskeyStreamChannel,
  // params: {
  //   local?: boolean;
  //   media?: boolean;
  //   reply?: boolean;
  //   renote?: boolean;
  //   poll?: boolean;
  //   myRenote?: boolean;
  //   myReaction?: boolean;
  //   following?: boolean;
  // } = {}
) => {
  return new WebSocket(`wss://${host}/streaming?i=${token}`);
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

export const useMisskeyStream = ({
  onChannel,
  onNoteUpdated,
  onEmojiAdded,
}: {
  onChannel: (event: string, data: any) => void;
  onNoteUpdated: (event: string, data: any) => void;
  onEmojiAdded: (event: string, data: any) => void;
}) => {
  let ws: WebSocket;
  const shouldConnect = ref(false);
  const wsNoteSubScriptionQueue: string[] = [];
  const webSocketId = ref<string | null>(null);

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

  const connect = ({ host, token, channel }: { host: string; token: string; channel: MisskeyStreamChannel }) => {
    shouldConnect.value = true;
    webSocketId.value = nanoid();
    ws = connectToMisskeyStream(host, token);

    ws.onopen = () => {
      console.info("ws:open");

      ws?.send(
        JSON.stringify({
          type: "connect",
          body: { channel, id: webSocketId.value, params: {} },
        }),
      );
    };

    ws.onerror = () => {
      console.error("ws:error");
    };

    ws.onclose = () => {
      console.info("ws:close");
      if (shouldConnect.value) {
        setTimeout(() => {
          connect({ host, token, channel });
        }, 1000);
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "connected":
          onConnected();
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
