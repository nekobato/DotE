import Layout from "./Layout.vue";
import type { Theme } from "vitepress";
import "./style.css";
import "../../../src/assets/styles/index.scss";

export default {
  Layout,
  enhanceApp({ app, router, siteData }) {
    // ...
  },
} satisfies Theme;
