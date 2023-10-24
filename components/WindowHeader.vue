<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { useStore } from "~/store";

const props = defineProps({
  exitType: {
    type: String as PropType<"close" | "quit" | "back">,
    required: true,
  },
});

const store = useStore();

const close = () => {
  ipcSend("post:close");
};

const quit = () => {
  ipcSend("quit");
};

const back = () => {
  ipcSend("set-hazy-mode", { mode: "settings" });
};

const updateApp = () => {
  ipcSend("update-app");
};
</script>

<template>
  <div class="window-header">
    <button class="nn-button type-ghost" v-if="props.exitType === 'close'" @click="close">
      <Icon icon="mingcute:close-line" class="nn-icon size-small" />
    </button>
    <button class="nn-button type-ghost" v-if="props.exitType === 'quit'" @click="quit">
      <Icon icon="mingcute:power-line" class="nn-icon size-small" />
    </button>
    <button class="nn-button type-ghost" v-if="props.exitType === 'back'" @click="back">
      <Icon icon="mingcute:arrow-left-line" class="nn-icon size-small" />
    </button>
    <button class="nn-button type-secondary size-small update" v-if="store.settings.shouldAppUpdate" @click="updateApp">
      INSTALL UPDATE
    </button>
    <div class="rest"></div>
  </div>
</template>

<style lang="scss" scoped>
.window-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--hazy-color-white-t1);
  border-radius: 8px;
}
.rest {
  flex: 1;
  -webkit-app-region: drag;
  width: 100%;
  height: 100%;
}
.update {
  margin: 0 0 0 auto;
}
</style>
