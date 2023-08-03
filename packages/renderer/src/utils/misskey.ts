import { Post } from "@/types/Post";
import { Emoji, MisskeyFile, MisskeyNote, MisskeyUser } from "@/types/misskey";

export type User = {
  id?: string;
  userId: string;
  instanceUrl: string;
  token: string;
  name: string;
  username: string;
  avatarUrl: string;
};

export const misskeyUserToUser = (instanceUrl: string, user: MisskeyUser, token: string): Omit<User, "id"> => {
  return {
    userId: user.id,
    instanceUrl: instanceUrl,
    token: token,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
};

export const parseMisskeyUsername = (username: string, emojis: Emoji[]): string => {
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

export const parseMisskeyNote = (note: MisskeyNote, emojis: Emoji[]): Post => {
  const parsedTextHtml = note.text
    // 文中のURLをaタグに変換
    ?.replace(/(https?:\/\/[\w!?/+\-_~;.,*&@#$%()='[\]]+)/g, (match, p1) => {
      return `<a href="${p1}" target="_blank" rel="noopener noreferrer">${p1}</a>`;
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
    text: parsedTextHtml,
    user: {
      id: note.user.id,
      name: parseMisskeyUsername(note.user.name, emojis),
      avatarUrl: note.user.avatarUrl,
    },
    repost: note.renote ? parseMisskeyNote(note.renote, emojis) : undefined,
    attachments: [
      ...note.files.map(
        (file: MisskeyFile) => {
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
        ...poll
      ),
    ],
    reactions: Object.keys(note.reactions).map((key) => {
      const reactionName = key.replace(/:|@\./g, "");
      const localEmoji = emojis.find((emoji) => emoji.name === reactionName);
      return {
        name: key,
        url: localEmoji?.url || note.reactionEmojis[reactionName] || "",
        count: note.reactions[key],
        isRemote: !localEmoji,
      };
    }),
    myReaction: note.myReaction,
  };
};

export const parseMisskeyNotes = (notes: MisskeyNote[], emojis: Emoji[]): Post[] => {
  return notes?.map((note) => parseMisskeyNote(note, emojis));
};

export const parseMisskeyText = (text: string, emojis: Emoji[]): string => {
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
