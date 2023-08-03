export type Tweet = {
  id: number;
  idStr: string;
  text: string;
  truncated: boolean;
  entities: {
    hashtags: Array<{ text: string; indices: number[] }>;
    symbols: Array<{ text: string; indices: number[] }>;
    userMentions: Array<{
      screenName: string;
      name: string;
      id: number;
      idStr: string;
      indices: number[];
    }>;
    urls: Array<{
      url: string;
      expandedUrl: string;
      displayUrl: string;
      indices: number[];
    }>;
  };
  source: string;
  inReplyToStatusId: number | null;
  inReplyToStatusIdStr: string | null;
  inReplyToUserId: number | null;
  inReplyToUserIdStr: string | null;
  inReplyToScreenName: string | null;
  user: {
    id?: number;
    name: string;
    screenName: string;
    profileImageUrl: string;
  };
  createdAt: string;
};

export type TweetDataV2 = {
  data: {
    data: any[];
    includes: {
      media: {
        width: number;
        height: number;
        media_key: string;
        type: string;
        url: string;
      }[];
      users: {
        id: string;
        name: string;
        protected: boolean;
        username: string;
        verified: boolean;
      }[];
    };
    meta: any;
  };
  meta: {
    newest_id: string;
    next_token: string;
    oldest_id: string;
    result_count: number;
  };
  tweets: any[];
};
