import type { Post } from "@shared/types/post";
import type { MisskeyNote } from "@shared/types/misskey";
import { MisskeyChannelName } from "@shared/types/store";
import { MisskeyStreamChannel } from "./misskeyStream";

export const misskeyChannels: MisskeyChannelName[] = [
  "misskey:homeTimeline",
  "misskey:localTimeline",
  "misskey:socialTimeline",
  "misskey:globalTimeline",
  "misskey:userList",
  "misskey:hashtag",
  "misskey:antenna",
  "misskey:channel",
  "misskey:search",
];

export const misskeyStreamChannels: MisskeyStreamChannel[] = [
  "homeTimeline",
  "localTimeline",
  "globalTimeline",
  "userList",
  "hashtag",
  "antenna",
  "channel",
];

export const parseMisskeyAttachments = (post: MisskeyNote, host?: string): Post["attachments"] => {
  const files = post.files?.length
    ? post.files
    : (post.renote as MisskeyNote)?.files?.length
      ? (post.renote as MisskeyNote).files
      : [];
  const poll = post.poll || (post.renote as MisskeyNote)?.poll;

  const fileAttachments =
    files?.map((file) => {
      return {
        type: file.type.split("/")[0] as "image" | "video",
        url: file.url,
        thumbnailUrl: file.thumbnailUrl || "",
        size: {
          width: file.properties.width,
          height: file.properties.height,
        },
        isSensitive: file.isSensitive,
      };
    }) || [];
  const pollAttachments = poll
    ? [
        {
          type: "poll" as const,
          voted: poll.choices.some((choice) => choice.isVoted),
          url: post.url || new URL(`/notes/${post.id}`, host).toString(),
        },
      ]
    : [];
  return [...fileAttachments, ...pollAttachments];
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

export const emojisObject2Array = (emojis: { [name: string]: string }): { name: string; url: string }[] => {
  return Object.entries(emojis).map(([name, url]) => {
    return {
      name,
      url,
    };
  });
};
