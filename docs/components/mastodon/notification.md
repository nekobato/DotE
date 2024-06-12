<script setup lang="ts">
import Box from "../Box.vue";
import MastodonNotification from "../../../src/components/MastodonNotification.vue";
import PostList from "../../../src/components/PostList.vue";

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
    statuses_count: 33,
    last_status_at: "2024-05-27",
    noindex: false,
    emojis: [],
    roles: [],
    fields: []
  },
  media_attachments: [],
  mentions: [],
  tags: [],
  emojis: [],
  card: null,
  poll: null
};

const notifications = [
  {
    id: "34975861",
    type: "mention",
    created_at: "2019-11-23T07:49:02.064Z",
    account: defaultToot.account,
    status: defaultToot,
    mentions: [
      {
        id: "14715",
        username: "trwnh",
        url: "https://mastodon.social/@trwnh",
        acct: "trwnh"
      }
    ]
  },
  {
    id: "34975535",
    type: "favourite",
    created_at: "2019-11-23T07:29:18.903Z",
    account: {
      id: "297420",
      username: "haskal",
      acct: "haskal@cybre.space"
    },
    status: defaultToot,
  }
];
</script>

<Box title="notification">
  <MastodonNotification
    v-for="notification in notifications"
    :type="notification.type"
    :post="notification.status"
    :by="notification.account" />
</Box>
