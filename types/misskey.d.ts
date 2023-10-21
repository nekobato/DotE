import { entities } from "misskey-js";
import * as mfm from "mfm-js";

export type MisskeyNote = entities.Note & {
  reactionEmojis: {
    [key: string]: string;
  };
};

export { api as MisskeyApi, entities as MisskeyEntities };
