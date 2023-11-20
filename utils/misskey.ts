import type { Post } from "@/types/post";
import { useTimelineStore } from "~/store/timeline";
import type { MisskeyNote } from "~/types/misskey";

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

export const parseMisskeyText = (text: string | null, emojis: { name: string; url: string }[]): string => {
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

export const isMyReaction = (reaction: string, myReaction?: string) => {
  if (!myReaction) return false;
  return reaction === myReaction;
};

export const createReaction = async (postId: string, reaction: string) => {
  const timelineStore = useTimelineStore();
  await timelineStore.createReaction({
    postId,
    reaction,
  });
};

export const deleteReaction = async (postId: string, noUpdate: boolean) => {
  const timelineStore = useTimelineStore();
  await timelineStore.deleteReaction({
    postId,
    noUpdate,
  });
};

export const emojisObject2Array = (emojis: { [name: string]: string }): { name: string; url: string }[] => {
  return Object.entries(emojis).map(([name, url]) => {
    return {
      name,
      url,
    };
  });
};
