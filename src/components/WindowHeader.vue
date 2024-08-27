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

type Title = "exit" | "haze" | "post" | "reload" | "settings";

const exitModeMap = {
  post: "閉じる",
  main: "終了",
  settings: "戻る",
};

const buttonTitle = (type: Title) => {
  const titles = {
    exit: exitModeMap[props.windowType],
    haze: "ウィンドウ透過モード",
    post: "投稿",
    reload: "タイムライン更新",
    settings: "設定",
  };

  return titles[type];
};

const exit = () => {
  switch (props.windowType) {
    case "post":
      ipcSend("post:close");
      break;
    case "main":
      ipcSend("set-mode", { mode: "hide" });
      break;
    case "settings":
      router.push("/main/timeline");
      break;
  }
};

const haze = () => {
  ipcSend("set-mode", { mode: "haze" });
};

const post = () => {
  ipcSend("post:create");
};

const reload = () => {
  ipcSend("main:reload");
};

const settings = () => {
  router.push("/main/settings");
};
</script>

<template>
  <div class="window-header">
    <button class="nn-button type-ghost exit" @click="exit" :title="buttonTitle('exit')" :disabled="!props.canBack">
      <Icon icon="mingcute:close-line" class="nn-icon size-xsmall" v-if="props.windowType === 'post'" />
      <Icon icon="mingcute:close-line" class="nn-icon size-xsmall" v-if="props.windowType === 'main'" />
      <Icon icon="mingcute:arrow-left-line" class="nn-icon size-xsmall" v-if="props.windowType === 'settings'" />
    </button>
    <button
      class="nn-button type-ghost haze"
      @click="haze"
      v-if="props.windowType === 'main'"
      :title="buttonTitle('haze')"
    >
      <Icon icon="mingcute:ghost-line" class="nn-icon size-xsmall" />
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
}
.nn-button {
  width: 160px;
  height: 24px;
  min-height: auto;
  &.exit {
    margin: 0 auto;
  }
}
.title-flyout {
  position: absolute;
  top: 28px;
  left: 0;
  width: 100%;
  height: 24px;
  background-color: var(--color-background);
  border-radius: 4px;
  > p {
    color: var(--dote-text-color);
    font-size: 12px;
    text-align: center;
  }
}
</style>
