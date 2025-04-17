<script setup lang="ts">
import { ElCarousel, ElCarouselItem } from "element-plus";
import { useData, withBase } from "vitepress";
import DonwloadLink from "./DonwloadLink.vue";
import RefLink from "./RefLink.vue";
import { ThemeConfig } from "../types/themeConfig";

// https://vitepress.dev/reference/runtime-api#usedata
const { site, frontmatter } = useData<ThemeConfig>();
</script>

<template>
  <div class="layout">
    <main>
      <div class="contents-box">
        <div class="contents-side">
          <img
            class="appicon"
            :src="withBase(site.themeConfig.appicon)"
            alt="logo"
          />
          <div v-if="frontmatter.home">
            <h1>{{ site.title }}</h1>
            <p>{{ site.description }}</p>
          </div>
          <ClientOnly>
            <DonwloadLink
              class="download-link"
              :links="site.themeConfig.downloadLinks"
            />
          </ClientOnly>
          <RefLink class="ref-link" :links="site.themeConfig.refLinks" />
        </div>
        <div class="thumbnails-side">
          <ElCarousel
            class="thumbnails-carousel"
            height="100%"
            :interval="5000"
          >
            <ElCarouselItem
              v-for="thumbnail in site.themeConfig.thumbnails"
              :key="thumbnail"
              class="thumnail-item"
            >
              <img
                class="thumbnail"
                :src="withBase(thumbnail)"
                alt="thumbnail"
              />
            </ElCarouselItem>
          </ElCarousel>
        </div>
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
$bg-grid-size: 40px;
.layout {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: var(--color-grey-50);
  background-image: linear-gradient(
      0deg,
      transparent #{$bg-grid-size - 1px},
      var(--color-grey-100) $bg-grid-size
    ),
    linear-gradient(
      90deg,
      transparent #{$bg-grid-size - 1px},
      var(--color-grey-100) $bg-grid-size
    );
  background-size: $bg-grid-size $bg-grid-size;
}
main {
  color: #fff;
}
.contents-box {
  width: 800px;
  height: 400px;
  background: var(--color-black-t700);
  box-shadow: 0 4px 32px var(--color-black-t300);
  border: 1px solid var(--color-white-t200);
  border-radius: 24px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 50% 50%;
  overflow: hidden;
}
.contents-side {
  position: relative;
  padding: 24px;
  height: 100%;
  color: var(--color-grey-50);

  h1 {
    margin: 20px auto 0;
    line-height: 1;
    font-size: var(--font-size-32);
    font-weight: normal;
  }

  p {
    margin: 16px auto 0;
    font-size: var(--font-size-14);
    white-space: pre-wrap;
  }
}
.appicon {
  display: inline-flex;
  width: 128px;
  height: 128px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background-color: rgba(255, 255, 255, 0.32);
  border-radius: 16px;
}
.download-link {
  position: absolute;
  top: 24px;
  right: 24px;
}
.ref-link {
  position: absolute;
  bottom: 24px;
  left: 24px;
}
.thumbnails-side {
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  .thumbnails-carousel {
    height: 100%;
    .thumbnail-item {
      height: 100%;
    }
    .thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}
</style>
