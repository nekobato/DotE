import { MastodonChannelName } from "@shared/types/store";

export const mastodonChannelsMap: Record<MastodonChannelName, string> = {
  "mastodon:homeTimeline": "ホーム",
  "mastodon:localTimeline": "ローカル",
  "mastodon:publicTimeline": "公共",
  "mastodon:hashtag": "ハッシュタグ",
  "mastodon:list": "リスト",
  "mastodon:notifications": "通知",
};

export const mastodonChannels: MastodonChannelName[] = Object.keys(mastodonChannelsMap) as MastodonChannelName[];

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
