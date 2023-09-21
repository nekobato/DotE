import { entities } from "misskey-js";

export type MisskeyNote = entities.Note & {
  reactionEmojis: {
    [key: string]: string;
  };
};

export { api as MisskeyApi, entities as MisskeyEntities };
