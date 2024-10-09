<script setup lang="ts">
import { useData } from "vitepress";

// https://vitepress.dev/reference/runtime-api#usedata
const { site, frontmatter } = useData();
</script>

<template>
  <div v-if="frontmatter.home">
    <h1>{{ site.title }}</h1>
    <p>{{ site.description }}</p>
  </div>
  <div class="contents" v-else>
    <Content />
  </div>
</template>

<style scoped>
.contents {
  min-height: 100%;
  padding: 40px;
  background: var(--color-background);
}
</style>
