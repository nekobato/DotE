import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "./assets/styles/index.scss";
import App from "./App.vue";
import router from "./router";
import { initializeRendererSentry } from "./sentry";

const app = createApp(App).use(createPinia()).use(router).use(ElementPlus);

initializeRendererSentry(app);

app.mount("#app");
