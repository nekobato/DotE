<script setup lang="ts">
import { ChannelName } from "@shared/types/store";
import { type PropType } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps({
  channel: {
    type: String as PropType<ChannelName>,
    required: false,
  },
});

const channelNameToIconMap = {
  "misskey:homeTimeline": "tabler:home",
  "misskey:localTimeline": "tabler:planet",
  "misskey:socialTimeline": "tabler:universe",
  "misskey:globalTimeline": "tabler:whirl",
  "misskey:userList": "tabler:list",
  "misskey:hashtag": "tabler:hash",
  "misskey:antenna": "tabler:antenna",
  "misskey:channel": "tabler:device-tv",
  "misskey:search": "tabler:search",
  "misskey:notifications": "tabler:bell",
  "mastodon:homeTimeline": "mingcute:home-3-line",
  "mastodon:localTimeline": "mingcute:group-3-line",
  "mastodon:publicTimeline": "mingcute:earth-2-line",
  "mastodon:hashtag": "mingcute:hashtag-line",
  "mastodon:list": "mingcute:list-check-line",
  "mastodon:notifications": "mingcute:notification-line",
  "bluesky:homeTimeline": "mingcute:home-3-line",
};
</script>
<template>
  <div class="channel-icon">
    <Icon v-if="props.channel" :icon="channelNameToIconMap[props.channel]" />
  </div>
</template>
<style lang="scss" scoped>
.channel-icon {
  display: contents;

  > .icon {
    width: 24px;
    height: 24px;
    color: var(--dote-color-white);
  }
}
</style>
