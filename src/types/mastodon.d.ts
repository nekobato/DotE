export type MastodonEmoji = {
  shortcode: string;
  url: string;
  static_url: string;
  visible_in_picker: boolean;
};

export type MediaAttachment = {
  id: string;
  type: string;
  url: string;
  preview_url: string;
  remote_url: any;
  preview_remote_url: any;
  text_url: any;
  meta: {
    original: {
      width: number;
      height: number;
      size: string;
      aspect: number;
    };
    small: {
      width: number;
      height: number;
      size: string;
      aspect: number;
    };
    focus: {
      x: number;
      y: number;
    };
  };
  description: string;
  blurhash: string;
};

export type MastodonAccount = {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  locked: boolean;
  bot: boolean;
  discoverable: boolean;
  group: boolean;
  created_at: string;
  note: string;
  url: string;
  avatar: string;
  avatar_static: string;
  header: string;
  header_static: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  last_status_at: string;
  noindex: boolean;
  emojis: MastodonEmoji[];
  fields: Array<any>;
};

export type MastodonInstanceApiResponse = {
  domain: string;
  title: string;
  version: string;
  source_url: string;
  description: string;
  usage: {
    users: {
      active_month: number;
    };
  };
  thumbnail: {
    url: string;
  };
  languages: Array<string>;
  configuration: {
    urls: {
      streaming: string;
      status: string;
    };
    accounts: {
      max_featured_tags: number;
    };
    statuses: {
      max_characters: number;
      max_media_attachments: number;
      characters_reserved_per_url: number;
    };
    media_attachments: {
      supported_mime_types: Array<string>;
      image_size_limit: number;
      image_matrix_limit: number;
      video_size_limit: number;
      video_frame_rate_limit: number;
      video_matrix_limit: number;
    };
    polls: {
      max_options: number;
      max_characters_per_option: number;
      min_expiration: number;
      max_expiration: number;
    };
    translation: {
      enabled: boolean;
    };
  };
  registrations: {
    enabled: boolean;
    approval_required: boolean;
    message: any;
  };
  contact: {
    email: string;
    account: MastodonAccount;
  };
  rules: Array<any>;
};

export type MastodonGetAccountApiResponse = {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  locked: boolean;
  bot: boolean;
  discoverable: boolean;
  group: boolean;
  created_at: string;
  note: string;
  url: string;
  avatar: string;
  avatar_static: string;
  header: string;
  header_static: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  last_status_at: string;
  noindex: boolean;
  source: {
    privacy: string;
    sensitive: boolean;
    language: any;
    note: string;
    fields: Array<any>;
    follow_requests_count: number;
  };
  emojis: MastodonEmoji[];
  roles: Array<any>;
  fields: Array<any>;
  role: {
    id: string;
    name: string;
    permissions: string;
    color: string;
    highlighted: boolean;
  };
};

export type MastodonToot = {
  id: string;
  created_at: string;
  in_reply_to_id: any;
  in_reply_to_account_id: any;
  sensitive: boolean;
  spoiler_text: string;
  visibility: string;
  language?: string;
  uri: string;
  url: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  edited_at: any;
  favourited: boolean;
  reblogged: boolean;
  muted: boolean;
  bookmarked: boolean;
  content: string;
  filtered: Array<any>;
  reblog?: {
    id: string;
    created_at: string;
    in_reply_to_id: any;
    in_reply_to_account_id: any;
    sensitive: boolean;
    spoiler_text: string;
    visibility: string;
    language: string;
    uri: string;
    url: string;
    replies_count: number;
    reblogs_count: number;
    favourites_count: number;
    edited_at: any;
    favourited: boolean;
    reblogged: boolean;
    muted: boolean;
    bookmarked: boolean;
    content: string;
    filtered: Array<any>;
    reblog: any;
    account: MastodonAccount;
    media_attachments: Array<MediaAttachment>;
    mentions: Array<any>;
    tags: Array<any>;
    emojis: MastodonEmoji[];
    card: {
      url: string;
      title: string;
      description: string;
      type: string;
      author_name: string;
      author_url: string;
      provider_name: string;
      provider_url: string;
      html: string;
      width: number;
      height: number;
      image: string;
      embed_url: string;
      blurhash: string;
    };
    poll: any;
  };
  application?: {
    name: string;
    website?: string;
  };
  account: MastodonAccount;
  media_attachments: Array<MediaAttachment>;
  mentions: Array<any>;
  tags: Array<any>;
  emojis: MastodonEmoji[];
  card: any;
  poll: any;
  application?: {
    name: string;
    website?: string;
  };
  pinned?: boolean;
};

export type MastodonNotification = {
  id: string;
  type: "mention" | "reblog" | "favourite" | "follow";
  created_at: string;
  account: MastodonAccount;
  status?: MastodonToot;
};

export type MastodonListItem = {
  id: string;
  title: string;
  replies_policy: string;
  exclusive: boolean;
};
