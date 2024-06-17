<script setup lang="ts">
import Box from '../Box.vue'
import MastodonToot from '../../../src/components/MastodonToot.vue'
import PostList from '../../../src/components/PostList.vue'

const defaultToot = {
  id: "112510903912896388",
  created_at: "2024-05-27T03:22:30.039Z",
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  sensitive: false,
  spoiler_text: "",
  visibility: "public",
  language: "ja",
  uri: "https://mstdn.jp/users/nekobato/statuses/112510903912896388",
  url: "https://mstdn.jp/@nekobato/112510903912896388",
  replies_count: 1,
  reblogs_count: 0,
  favourites_count: 0,
  edited_at: null,
  favourited: false,
  reblogged: false,
  muted: false,
  bookmarked: false,
  pinned: false,
  content: "\u003cp\u003eテストだよ\u003c/p\u003e",
  filtered: [],
  reblog: null,
  application: {
    name: "Web",
    website: null,
  },
  account: {
    id: "109291844877523534",
    username: "nekobato",
    acct: "nekobato",
    display_name: "",
    locked: false,
    bot: false,
    discoverable: false,
    group: false,
    created_at: "2022-11-05T00:00:00.000Z",
    note: "",
    url: "https://mstdn.jp/@nekobato",
    avatar: "https://media.mstdn.jp/accounts/avatars/109/291/844/877/523/534/original/60ea7f147a10a608.png",
    avatar_static: "https://media.mstdn.jp/accounts/avatars/109/291/844/877/523/534/original/60ea7f147a10a608.png",
    header: "https://mstdn.jp/headers/original/missing.png",
    header_static: "https://mstdn.jp/headers/original/missing.png",
    followers_count: 2,
    following_count: 2,
    statuses_count: 33,
    last_status_at: "2024-05-27",
    noindex: false,
    emojis: [],
    roles: [],
    fields: [],
  },
  media_attachments: [],
  mentions: [],
  tags: [],
  emojis: [],
  card: null,
  poll: null,
};

const replyToot = {
  id: "112510904332552457",
  created_at: "2024-05-27T03:22:36.440Z",
  in_reply_to_id: "112510903912896388",
  in_reply_to_account_id: "109291844877523534",
  sensitive: false,
  spoiler_text: "",
  visibility: "public",
  language: "ja",
  uri: "https://mstdn.jp/users/nekobato/statuses/112510904332552457",
  url: "https://mstdn.jp/@nekobato/112510904332552457",
  replies_count: 0,
  reblogs_count: 0,
  favourites_count: 0,
  edited_at: null,
  favourited: false,
  reblogged: false,
  muted: false,
  bookmarked: false,
  pinned: false,
  content: "\u003cp\u003eリプライ\u003c/p\u003e",
  filtered: [],
  reblog: null,
  application: {
    name: "Web",
    website: null,
  },
  account: {
    id: "109291844877523534",
    username: "nekobato",
    acct: "nekobato",
    display_name: "",
    locked: false,
    bot: false,
    discoverable: false,
    group: false,
    created_at: "2022-11-05T00:00:00.000Z",
    note: "",
    url: "https://mstdn.jp/@nekobato",
    avatar: "https://media.mstdn.jp/accounts/avatars/109/291/844/877/523/534/original/60ea7f147a10a608.png",
    avatar_static: "https://media.mstdn.jp/accounts/avatars/109/291/844/877/523/534/original/60ea7f147a10a608.png",
    header: "https://mstdn.jp/headers/original/missing.png",
    header_static: "https://mstdn.jp/headers/original/missing.png",
    followers_count: 2,
    following_count: 2,
    statuses_count: 33,
    last_status_at: "2024-05-27",
    noindex: false,
    emojis: [],
    roles: [],
    fields: [],
  },
  media_attachments: [],
  mentions: [],
  tags: [],
  emojis: [],
  card: null,
  poll: null,
};

const imageToot = {
  id: "112511638480134233",
  created_at: "2024-05-27T06:29:18.650Z",
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  sensitive: false,
  spoiler_text: "",
  visibility: "public",
  language: "ja",
  uri: "https://mstdn.jp/users/nekobato/statuses/112511638480134233",
  url: "https://mstdn.jp/@nekobato/112511638480134233",
  replies_count: 0,
  reblogs_count: 0,
  favourites_count: 0,
  edited_at: null,
  favourited: false,
  reblogged: false,
  muted: false,
  bookmarked: false,
  pinned: false,
  content: "\u003cp\u003eスタバ\u003c/p\u003e",
  filtered: [],
  reblog: null,
  application: {
    name: "Web",
    website: null
  },
  account: {
    id: "109291844877523534",
    username: "nekobato",
    acct: "nekobato",
    display_name: "",
    locked: false,
    bot: false,
    discoverable: false,
    group: false,
    created_at: "2022-11-05T00:00:00.000Z",
    note: "",
    url: "https://mstdn.jp/@nekobato",
    avatar:
      "https://media.mstdn.jp/accounts/avatars/109/291/844/877/523/534/original/60ea7f147a10a608.png",
    avatar_static:
      "https://media.mstdn.jp/accounts/avatars/109/291/844/877/523/534/original/60ea7f147a10a608.png",
    header: "https://mstdn.jp/headers/original/missing.png",
    header_static: "https://mstdn.jp/headers/original/missing.png",
    followers_count: 2,
    following_count: 2,
    statuses_count: 34,
    last_status_at: "2024-05-27",
    noindex: false,
    emojis: [],
    roles: [],
    fields: []
  },
  media_attachments: [
    {
      id: "112511637442977424",
      type: "image",
      url: "https://media.mstdn.jp/media_attachments/files/112/511/637/442/977/424/original/d13a1fb5b3302b23.jpeg",
      preview_url:
        "https://media.mstdn.jp/media_attachments/files/112/511/637/442/977/424/small/d13a1fb5b3302b23.jpeg",
      remote_url: null,
      preview_remote_url: null,
      text_url: null,
      meta: {
        original: {
          width: 1659,
          height: 1250,
          size: "1659x1250",
          aspect: 1.3272
        },
        small: {
          width: 553,
          height: 417,
          size: "553x417",
          aspect: 1.3261390887290168
        },
        focus: {
          x: 0.0,
          y: 0.0
        }
      },
      description: "ラーメン",
      blurhash: "UDIz|vrW}pIUJoM|D+xZDiX9jEx[E3t6IU%2"
    }
  ],
  mentions: [],
  tags: [],
  emojis: [],
  card: null,
  poll: null
};

const mentionToot = {
  id: "112511988171037262",
  created_at: "2024-05-27T07:58:14.511Z",
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  sensitive: true,
  spoiler_text: "CWだよ",
  visibility: "direct",
  language: "ja",
  uri: "https://mstdn.jp/users/nekobato/statuses/112511988171037262",
  url: "https://mstdn.jp/@nekobato/112511988171037262",
  replies_count: 0,
  reblogs_count: 0,
  favourites_count: 0,
  edited_at: null,
  favourited: false,
  reblogged: false,
  muted: false,
  bookmarked: false,
  content:
    '\u003cp\u003e\u003cspan class="h-card"\u003e\u003ca href="https://mstdn.jp/@nekobato" class="u-url mention"\u003e@\u003cspan\u003enekobato\u003c/span\u003e\u003c/a\u003e\u003c/span\u003e いろいろコンテンツ :vue:\u003c/p\u003e',
  filtered: [],
  reblog: null,
  application: {
    name: "Web",
    website: null
  },
  account: {
    id: "109291844877523534",
    username: "nekobato",
    acct: "nekobato",
    display_name: "",
    locked: false,
    bot: false,
    discoverable: false,
    group: false,
    created_at: "2022-11-05T00:00:00.000Z",
    note: "",
    url: "https://mstdn.jp/@nekobato",
    avatar:
      "https://media.mstdn.jp/accounts/avatars/109/291/844/877/523/534/original/60ea7f147a10a608.png",
    avatar_static:
      "https://media.mstdn.jp/accounts/avatars/109/291/844/877/523/534/original/60ea7f147a10a608.png",
    header: "https://mstdn.jp/headers/original/missing.png",
    header_static: "https://mstdn.jp/headers/original/missing.png",
    followers_count: 2,
    following_count: 2,
    statuses_count: 34,
    last_status_at: "2024-05-27",
    noindex: false,
    emojis: [],
    roles: [],
    fields: []
  },
  media_attachments: [],
  mentions: [
    {
      id: "109291844877523534",
      username: "nekobato",
      url: "https://mstdn.jp/@nekobato",
      acct: "nekobato"
    }
  ],
  tags: [],
  emojis: [
    {
      shortcode: "vue",
      url: "https://media.mstdn.jp/custom_emojis/images/000/002/166/original/8d4f8d688a27f641.png",
      static_url:
        "https://media.mstdn.jp/custom_emojis/images/000/002/166/static/8d4f8d688a27f641.png",
      visible_in_picker: true
    }
  ],
  card: null,
  poll: null
};

const defaultProps = {
  instanceUrl: "https://mstdn.jp",
  lineStyle: "all",
};
</script>

<Box title="default">
  <MastodonToot v-bind="defaultProps" :post="defaultToot" />
</Box>

<Box title="Reply">
  <MastodonToot v-bind="defaultProps" :post="replyToot" />
</Box>

<Box title="ImageAttachment">
  <MastodonToot v-bind="defaultProps" :post="imageToot" />
</Box>

<Box title="Mention">
  <MastodonToot v-bind="defaultProps" :post="mentionToot" />
</Box>
