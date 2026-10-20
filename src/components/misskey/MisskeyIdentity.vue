<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  text: string;
  emojis: { name: string; url: string }[];
}>();

type IdentityPart = { text: string; type: "text" | "link" | "emoji"; url?: string };

const webUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

// Only text and explicit Vue attributes reach the DOM; identity strings are never parsed as HTML.
const parts = computed(() => {
  const result: IdentityPart[] = [];
  let offset = 0;
  for (const match of props.text.matchAll(/https?:\/\/[^\s<>"']+|:(\w+):/g)) {
    const index = match.index;
    if (index > offset) result.push({ type: "text", text: props.text.slice(offset, index) });
    const emoji = match[1] ? props.emojis.find((item) => item.name === match[1]) : undefined;
    const url = webUrl(emoji?.url ?? (match[1] ? "" : match[0]));
    result.push({ type: url ? (emoji ? "emoji" : "link") : "text", text: match[0], url });
    offset = index + match[0].length;
  }
  if (offset < props.text.length) result.push({ type: "text", text: props.text.slice(offset) });
  return result;
});
</script>

<template>
  <template v-for="(part, index) in parts" :key="index">
    <img v-if="part.type === 'emoji'" class="emoji" :src="part.url" :alt="part.text" />
    <a v-else-if="part.type === 'link'" :href="part.url" rel="noopener noreferrer">{{ part.text }}</a>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
