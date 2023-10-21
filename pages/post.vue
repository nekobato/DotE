<script lang="ts" setup>
import PostWindowHeader from "~/components/PostWindowHeader.vue";
const router = useRouter();

const pagedata = ref<any>({});

window.ipc.on("post:create", () => {
  router.push("/post/create");
});

window.ipc.on("post:close", () => {
  router.push("/post");
});

window.ipc.on("post:detail", (_, payload) => {
  pagedata.value = payload;
  console.info(pagedata);
  router.push("/post/detail");
});

window.ipc.on("post:reaction", (_, payload) => {
  pagedata.value = payload;
  console.log(payload);
  router.push("/post/reaction");
});
</script>

<template>
  <NuxtLayout name="columns" class="post-page">
    <PostWindowHeader />
    <NuxtPage :data="pagedata" />
  </NuxtLayout>
</template>
<style lang="scss" scoped></style>
