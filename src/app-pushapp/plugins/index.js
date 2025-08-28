import { createPinia } from "pinia";
import vuetify from "@app-pushapp/plugins/vuetify";
import layouts from "@app-pushapp/plugins/layouts";

import { useMetaStore } from "@/app-pushapp/views/common/useMetaStore";

export default {
  install(app) {
    console.log("[pushapp] [plugins] loading");

    app.use(createPinia());

    app.use(layouts);

    app.use(vuetify);

    // Any global components or mixins
    // app.component('MyComponent', MyComponent);

    // Any global properties
    // app.config.globalProperties.$appVersion = '1.0.0';

    const metaStore = useMetaStore();
    metaStore.fetchMeta();
  },
};
