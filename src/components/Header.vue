<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
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

const exit = () => {
  switch (props.windowType) {
    case "post":
      ipcSend("post:close");
      break;
    case "settings":
      router.push("/main/timeline");
      break;
  }
};
</script>

<template>
  <div class="window-header"></div>
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
</style>
