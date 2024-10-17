<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { PropType } from "vue";
import { useRouter } from "vue-router";

type WindowType = "main" | "post" | "settings";

const props = defineProps({
  windowType: {
    type: String as PropType<WindowType>,
    required: true,
  },
  canBack: {
    type: Boolean,
    default: true,
  },
});

const router = useRouter();

const back = () => {
  router.push("/main/timeline");
};
</script>

<template>
  <div class="window-header">
    <button class="nn-button type-ghost exit" v-if="props.windowType === 'settings'" @click="back">
      <Icon icon="mingcute:arrow-left-line" class="nn-icon size-xsmall" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.window-header {
  display: flex;
  flex: 1 0 auto;
  align-items: center;
  height: 40px;
  overflow: hidden;
  background-color: var(--dote-background-color);
  border: 1px solid var(--dote-border-color);
  -webkit-app-region: drag;
}
.nn-button {
  width: 160px;
  height: 24px;
  min-height: auto;
  -webkit-app-region: no-drag;
  &.exit {
    margin: 0 auto;
  }
}
</style>
