<script setup lang="ts">
import Box from '../Box.vue'
import MisskeyNote from '../../../src/components/MisskeyNote.vue'
import PostList from '../../../src/components/PostList.vue'

const text =
  "Misskeyはフリーかつオープンなプロジェクトで、誰でも自由にMisskeyを使ったサーバーを作成できるため、既に様々なサーバーがインターネット上に公開されています。また重要な特徴として、MisskeyはActivityPubと呼ばれる分散通信プロトコルを実装しているので、どのサーバーを選んでも他のサーバーのユーザーとやりとりすることができます。これが分散型と言われる所以で、単一の運営者によって単一のURLで公開されるような、Twitterなどの他サービスとは根本的に異なっています。サーバーによって主な話題のテーマやユーザー層、言語などは異なり、自分にあったサーバーを探すのも楽しみのひとつです(もちろん自分のサーバーを作るのも一興です)。";

const note = {
  id: "1",
  createdAt: "2021-07-01T00:00:00.000Z",
  text: text,
  user: {
    id: "1",
    name: "User Name",
    username: "user",
    avatarUrl: "https://picsum.photos/128",
    host: null,
    avatarBlurhash: null,
    avatarDecorations: [],
    emojis: {},
    onlineStatus: "active",
  },
  emojis: {},
  files: [],
  userId: "1",
  visibility: "public",
  reactionAcceptance: "all",
  reactionEmojis: {},
  reactions: {},
  renoteCount: 0,
  repliesCount: 0,
};

const renote = {
  ...note,
  renote: note,
}

const reactions = {
  "👍": 10,
  "👎": 5,
};

const defaultProps = {
  post: note,
  emojis: [],
  lineStyle: "all",
  currentInstanceUrl: "https://misskey.io",
  hideCw: true,
  note: note,
};
</script>

<Box title="default">
  <MisskeyNote v-bind="defaultProps" />
</Box>

<Box title="lineStyle: line-1">
  <MisskeyNote v-bind="defaultProps" line-style="line-1" />
</Box>

<Box title="lineStyle: line-2">
  <MisskeyNote v-bind="defaultProps" line-style="line-2" />
</Box>

<Box title="lineStyle: line-3">
  <MisskeyNote v-bind="defaultProps" line-style="line-3" />
</Box>

<Box title="renote">
  <MisskeyNote v-bind="{ ...defaultProps, post: { ...renote, text: '' }}"  />
</Box>

<Box title="quote">
  <MisskeyNote v-bind="{ ...defaultProps, post: renote }"  />
</Box>

<Box title="with cw">
  <MisskeyNote v-bind="{ ...defaultProps, post: { ...note, cw: 'cw text' } }"  />
</Box>

<Box title="with cw">
  <MisskeyNote v-bind="{ ...defaultProps, post: { ...note, cw: 'cw text' }}" line-style="line-3" />
</Box>

<Box title="reactions">
  <MisskeyNote v-bind="{ ...defaultProps, post: { ...note, reactions: reactions } }"  />
</Box>

<Box>
  <PostList>
    <MisskeyNote v-bind='defaultProps' />
    <MisskeyNote v-bind='defaultProps' />
    <MisskeyNote v-bind='defaultProps' />
    <MisskeyNote v-bind='defaultProps' />
  </PostList>
</Box>

<Box>
  <PostList status="loading" />
</Box>
