import { MastodonChannelName } from "@shared/types/store";

export const mastodonChannels: MastodonChannelName[] = [
  "mastodon:homeTimeline",
  "mastodon:localTimeline",
  "mastodon:publicTimeline",
  "mastodon:hashtag",
  "mastodon:list",
  "mastodon:notifications",
];

export const mastodonStreamChannels = [
  "homeTimeline",
  "localTimeline",
  "publicTimeline",
  "hashtag",
  "list",
  "notifications",
];

export const parseMastodonText = (text: string | null, emojis: { shortcode: string; url: string }[]): string => {
  return (
    text
      // emojiをimgに変換
      ?.replace(/:(\w+):/g, (match: any, p1: string) => {
        const emoji = emojis.find((emoji) => emoji.shortcode === p1);
        if (emoji) {
          return `<img src="${emoji.url}" alt="${emoji.shortcode}" class="emoji" />`;
        } else {
          return match;
        }
      }) ?? ""
  );
};
