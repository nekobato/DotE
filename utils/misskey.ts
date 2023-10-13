import { Post } from "@/types/post";
import { useTimelineStore } from "~/store/timeline";
import { MisskeyEntities, MisskeyNote } from "~/types/misskey";
import { parse, parseSimple } from "mfm-js";

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
  const parsed = parseSimple(text ?? "");
  console.log(parsed);
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

export const structMisskeyNoteText = (text: string | null, emojis: MisskeyEntities.CustomEmoji[]): string => {
  const parsed = parse(text ?? "");
  return parsed
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.props.text;
        case "small":
          return `<small>${node.props?.text}</small>`;

        default:
          break;
      }
    })
    .join("");
};

export const isMyReaction = (reaction: string, myReaction?: string) => {
  if (!myReaction) return false;
  return reaction === myReaction;
};

export const createReaction = (postId: string, reaction: string) => {
  const timelineStore = useTimelineStore();
  timelineStore.createReaction({
    postId,
    reaction,
  });
};

export const deleteReaction = (postId: string, noUpdate: boolean) => {
  const timelineStore = useTimelineStore();
  timelineStore.deleteReaction({
    postId,
    noUpdate,
  });
};
