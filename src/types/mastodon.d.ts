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
    account: {
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
      emojis: Array<any>;
      roles: Array<any>;
      fields: Array<any>;
    };
  };
  rules: Array<any>;
};
