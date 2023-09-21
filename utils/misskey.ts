import { Post } from "@/types/post";
import { MisskeyEntities, MisskeyNote } from "~/types/misskey";

export const parseMisskeyAttachments = (files: MisskeyNote["files"]): Post["attachments"] => {
  return files.map((file) => {
    return {
      type: file.type.split("/")[0] as "image" | "video",
      url: file.url,
      thumbnailUrl: file.thumbnailUrl,
      size: {
        width: file.properties.width,
        height: file.properties.height,
      },
      isSensitive: file.isSensitive,
    };
  });
};

export const parseMisskeyNoteText = (text: string | null, emojis: MisskeyEntities.CustomEmoji[]): string => {
  return (
    text
      // 文中のURLをaタグに変換
      ?.replace(/(https?:\/\/[\w!?/+\-_~;.,*&@#$%()='[\]]+)/g, (_: any, p1: string) => {
        return `<a href="${p1}">${p1}</a>`;
      })
      // emojiをimgに変換
      ?.replace(/:(\w+):/g, (match: any, p1: string) => {
        const emoji = emojis.find((emoji) => emoji.name === p1);
        if (emoji) {
          return `<img src="${emoji.url}" alt="${emoji.name}" class="emoji" />`;
        } else {
          return match;
        }
      }) ?? ""
  );
};
