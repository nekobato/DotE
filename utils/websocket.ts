import { MisskeyNote } from "@/types/misskey";

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
