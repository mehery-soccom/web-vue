import { createPinia } from "pinia";
import vuetify from "@app-lead/plugins/vuetify";
import layouts from "@app-lead/plugins/layouts";

export default {
  install(app) {
    console.log("[lead] [plugins] loading");

    app.use(createPinia());

    app.use(layouts);

    app.use(vuetify);

    // Any global components or mixins
    // app.component('MyComponent', MyComponent);

    // Any global properties
    // app.config.globalProperties.$appVersion = '1.0.0';
  },
};
