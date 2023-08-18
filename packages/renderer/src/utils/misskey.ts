import { Post } from "@/types/Post";
import { MisskeyEntities } from "@/types/misskey";

export type User = {
  id?: string;
  userId: string;
  instanceUrl: string;
  token: string;
  name: string;
  username: string;
  avatarUrl: string;
};

export const misskeyUserToUser = (instanceUrl: string, user: MisskeyEntities.User, token: string): Omit<User, "id"> => {
  return {
    userId: user.id,
    instanceUrl: instanceUrl,
    token: token,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
};

export const parseMisskeyUsername = (username: string, emojis: MisskeyEntities.CustomEmoji[]): string => {
  return username
    ? username.replace(/:(\w+):/g, (match, p1) => {
        const emoji = emojis.find((emoji) => emoji.name === p1);
        if (emoji) {
          return `<img src="${emoji.url}" alt="${emoji.name}" class="emoji" />`;
        } else {
          return match;
        }
      })
    : "";
};

export const parseMisskeyNote = (note: MisskeyEntities.Note, emojis: MisskeyEntities.CustomEmoji[]): Post => {
  const parsedTextHtml = note.text
    // 文中のURLをaタグに変換
    ?.replace(/(https?:\/\/[\w!?/+\-_~;.,*&@#$%()='[\]]+)/g, (match, p1) => {
      return `<a onclick="(e) => window.OpenUrl(e, '${p1}')">${p1}</a>`;
    })
    // emojiをimgに変換
    ?.replace(/:(\w+):/g, (match, p1) => {
      const emoji = emojis.find((emoji) => emoji.name === p1);
      if (emoji) {
        return `<img src="${emoji.url}" alt="${emoji.name}" class="emoji" />`;
      } else {
        return match;
      }
    });

  // Linkをリスト化
  const linkList =
    note.text?.match(/https?:\/\/[\w!?/+\-_~;.,*&@#$%()='[\]]+/g)?.map((link) => {
      return {
        type: "link",
        url: link,
      };
    }) || [];

  const poll = note.poll ? [{ type: "poll", poll: note.poll }] : [];

  return {
    id: note.id,
    text: parsedTextHtml || "",
    user: {
      id: note.user.id,
      name: parseMisskeyUsername(note.user.name, emojis),
      avatarUrl: note.user.avatarUrl,
    },
    replyId: note.replyId,
    repost: note.renote ? parseMisskeyNote(note.renote, emojis) : undefined,
    attachments: [
      ...note.files.map(
        (file: MisskeyEntities.Note["files"][0]) => {
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
        },
        ...linkList,
        ...poll,
      ),
    ],
    reactions: Object.keys(note.reactions).map((key) => {
      const reactionName = key.replace(/:|@\./g, "");
      const localEmoji = emojis.find((emoji) => emoji.name === reactionName);
      return {
        name: key,
        // lacked type
        url: localEmoji?.url || (note as any).reactionEmojis[reactionName] || "",
        count: note.reactions[key],
        isRemote: !localEmoji,
      };
    }),
    myReaction: note.myReaction,
  };
};

export const parseMisskeyNotes = (notes: MisskeyEntities.Note[], emojis: MisskeyEntities.CustomEmoji[]): Post[] => {
  return notes?.map((note) => parseMisskeyNote(note, emojis));
};

export const parseMisskeyText = (text: string, emojis: MisskeyEntities.CustomEmoji[]): string => {
  const parsedTextHtml = text
    // emojiをimgに変換
    ?.replace(/:(\w+):/g, (match, p1) => {
      const emoji = emojis.find((emoji) => emoji.name === p1);
      if (emoji) {
        return `<img src="${emoji.url}" alt="${emoji.name}" class="emoji" />`;
      } else {
        return match;
      }
    });

  return parsedTextHtml;
};
