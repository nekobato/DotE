<script setup lang="ts">
import Bowser from "bowser";
import { Icon } from "@iconify/vue";
import { ThemeConfig } from "../types/themeConfig";

const props = defineProps<{ links: ThemeConfig["downloadLinks"] }>();

const visitorOS = Bowser.parse(window.navigator.userAgent).os;
</script>

<template>
  <section class="download-links">
    <h3>ダウンロード</h3>
    <div class="button-group" v-if="visitorOS.name === 'macOS' && props.links.macOS">
      <a class="link-button" :href="props.links.macOS.arm64" download>
        <Icon icon="mingcute:apple-fill" class="icon" />
        <div class="os-name">
          <span class="os">macOS</span>
          <span class="arch">(Apple Silicon)</span>
        </div>
      </a>
    </div>
    <div class="button-group" v-if="visitorOS.name === 'windows' && props.links.windows">
      <a class="link-button" :href="props.links.windows.x64" download>
        <Icon icon="mingcute:windows-fill" class="icon" />
        <div class="os-name">
          <span class="os">Windows</span>
          <span class="arch">(x64)</span>
        </div>
      </a>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.download-links {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 16px 10px;
  border: 1px solid var(--color-white-t100);
  border-radius: 12px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

h3 {
  position: absolute;
  top: -6px;
  margin: 0;
  padding: 0 4px;
  color: var(--color-grey-50);
  font-weight: bold;
  font-size: 12px;
  line-height: 1;
  backdrop-filter: blur(4px);
}

.link-button {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: start;
  width: 100%;
  padding: 8px 8px;
  text-decoration: none;
  background-color: var(--color-grey-50);
  border: 1px solid transparent;
  border-radius: 8px;
  transition: background-color 0.1s;

  &:hover {
    background-color: var(--color-grey-100);
  }

  * {
    flex: 0 0 auto;
  }

  .icon {
    width: 24px;
    height: 24px;
    color: var(--color-grey-400);
  }

  .os-name {
    display: flex;
    flex-direction: column;
    color: var(--color-grey-600);
    line-height: 1;

    .os {
      font-weight: bold;
      font-size: var(--font-size-18);
    }

    .arch {
      font-size: var(--font-size-12);
    }
  }
}
</style>
