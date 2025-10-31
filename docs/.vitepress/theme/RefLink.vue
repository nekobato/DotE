<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { ThemeConfig } from "../types/themeConfig";

const props = defineProps<{ links: ThemeConfig["refLinks"] }>();
</script>

<template>
  <section class="ref-links">
    <a class="link-button" v-for="link of props.links" :href="link.url">
      <Icon
        icon="mingcute:github-line"
        class="icon"
        v-if="link.type === 'github'"
      />
    </a>
  </section>
</template>

<style lang="scss" scoped>
.ref-links {
  display: flex;
  justify-content: start;
  align-items: center;
  flex-direction: column;
  gap: 8px;
}
.link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: transparent;
  text-decoration: none;
  transition: background-color 0.1s;
  border: 1px solid transparent;
  border-radius: 8px;
  gap: 8px;

  &:hover {
    background-color: var(--color-white-t100);
  }

  * {
    flex: 0 0 auto;
  }

  .icon {
    width: 24px;
    height: 24px;
    color: var(--color-grey-200);
  }
}
</style>
