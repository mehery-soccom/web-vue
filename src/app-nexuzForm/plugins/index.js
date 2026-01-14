import { createPinia } from "pinia";
import vuetify from "./vuetify";

export default {
  install(app) {
    console.log("[nexuzform] [plugins] loading");

    app.use(createPinia());

    app.use(vuetify);

    // Any global components or mixins
    // app.component('MyComponent', MyComponent);

    // Any global properties
    // app.config.globalProperties.$appVersion = '1.0.0';
  },
};
