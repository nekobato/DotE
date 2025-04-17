<script setup lang="ts">
import { Instance } from "@shared/types/store";
import { type PropType } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps({
  instance: {
    type: Object as PropType<Instance>,
  },
});
</script>
<template>
  <div class="instance-icon" v-if="props.instance">
    <Icon v-if="props.instance.type === 'bluesky'" icon="logos:bluesky" class="icon" />
    <ElAvatar v-else shape="square" :size="40" :src="props.instance.iconUrl" class="icon" />
  </div>
</template>
<style lang="scss" scoped>
.instance-icon {
  display: contents;

  > .icon {
    width: 40px;
    height: 40px;
    color: var(--color-white);
  }
}
</style>
