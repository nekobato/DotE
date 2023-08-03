<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { reactive } from "vue";

const state = reactive({
  active: "show",
});

const isActive = (mode: string) => {
  return state.active === mode;
};

const setActive = (mode: string) => {
  state.active = mode;
  ipcSend("set-hazy-mode", { mode });
};

const post = () => {
  ipcSend("post:create");
};
</script>

<template>
  <div class="menu">
    <div class="logo">hazy</div>
    <button :class="{ active: isActive('show') }" @click="setActive('show')">
      <Icon icon="ion:eye" class="nn-icon" />
    </button>
    <button :class="{ active: isActive('haze') }" @click="setActive('haze')">
      <Icon icon="ion:eye-outline" class="nn-icon" />
    </button>
    <button :class="{ active: isActive('hide') }" @click="setActive('hide')">
      <Icon icon="ion:eye-off" class="nn-icon" />
    </button>
    <button :class="{ active: isActive('settings') }" @click="setActive('settings')">
      <Icon icon="ion:settings" class="nn-icon" />
    </button>
    <hr />
    <button @click="post">
      <Icon icon="ion:pencil" class="nn-icon" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.menu {
  top: 4px;
  left: 4px;
  display: inline-flex;
  justify-content: flex-start;
  height: 24px;
  color: #fff;
  background: #000;
  border-radius: 4px;
}
.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  color: #fff;
  font-weight: bold;
  font-size: 12px;
  cursor: grab;
  -webkit-app-region: drag;
}
button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  margin: 0;
  padding: 0;
  color: #fff;
  font-size: 14px;
  background: transparent;
  border: 0;
  border-radius: 4px;
  &.active {
    top: -2px;
    height: 28px;
    color: #000;
    background-color: #fff;
  }
  > .nn-icon {
    width: 16px;
    height: 16px;
  }
}
hr {
  width: 1px;
  height: 20px;
  margin: auto 2px;
  background: rgba(255, 255, 255, 0.24);
  border: 0;
}
</style>
