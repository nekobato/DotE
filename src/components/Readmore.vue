<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import DoteLoading from "./common/DoteLoading.vue";
import { useTimelineReadmore } from "@/composables/useTimelineReadmore";
const { loading, canReadmore, readmore } = useTimelineReadmore();
</script>
<template>
  <div class="readmore-container" v-if="canReadmore">
    <button class="readmore-button nn-button" @click="readmore">
      <DoteLoading size="small" v-if="loading" />
      <Icon icon="mingcute:arrows-down-line" :width="24" :height="24" color="#adadad" v-else />
    </button>
  </div>
</template>
<style lang="scss">
.readmore-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.readmore-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 56px;
  color: var(--dote-text-color);
  background-color: var(--dote-background-color);
  border: none;
  border-radius: 0;
  transition: background-color 0.2s;
}
</style>
