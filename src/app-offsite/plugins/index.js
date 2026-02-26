import { createPinia } from "pinia";

export default {
  install(app) {
    console.log("[offsite] [plugins] loading");

    app.use(createPinia());
    // Any global components or mixins
    // app.component('MyComponent', MyComponent);

    // Any global properties
    // app.config.globalProperties.$appVersion = '1.0.0';
  },
};
