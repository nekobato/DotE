import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./assets/styles/index.scss";
import App from "./App.vue";
import router from "./router";

createApp(App).use(createPinia()).use(router).use(ElementPlus).mount("#app");
