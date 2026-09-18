<script setup lang="ts">
defineProps<{ count: number }>();
</script>

<template>
  <span v-if="count > 0" class="notification-badge" :aria-label="`未読通知 ${count} 件`">
    {{ count > 99 ? "99+" : String(count) }}
  </span>
</template>
