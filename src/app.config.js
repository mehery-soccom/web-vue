const AppConfig = require("@/@common/AppConfig");
const {
  form,
} = require("./app-pushapp/views/demos/components/dialog/demoCodeDialog");

module.exports = AppConfig.extend({
  apps: {
    default: {
      component: () => import("@/app/App.vue"),
      router: () => import("@/app/router"),
      context: "/",
      entry: "./src/main.js",
    },
    insights360: {
      component: () => import("@/app-insights360/AppInsights360.vue"),
      context: "/nexus/insights360",
      entry: "./src/main.js",
      plugins: () => import("@/app-insights360/plugins"),
    },
    notebook: {
      component: () => import("@/app-notebook/AppNotebook.vue"),
      context: "/nexus/notebook",
      entry: "./src/main.js",
      plugins: () => import("@/app-notebook/plugins"),
    },
    pushapp: {
      component: () => import("@/app-pushapp/AppPushapp.vue"),
      context: "/pushapp",
      entry: "./src/main.js",
      plugins: () => import("@/app-pushapp/plugins"),
    },
    phone: {
      component: () => import("@/app-phone/AppPhone.vue"),
      context: "/phone",
      entry: "./src/main.js",
      plugins: () => import("@/app-phone/plugins"),
    },
    lead: {
      component: () => import("@/app-lead/AppLead.vue"),
      context: "/lead",
      entry: "./src/main.js",
      plugins: () => import("@/app-lead/plugins"),
    },
    form: {
      component: () => import("@/app-form/AppForm.vue"),
      context: "/nexus/form",
      entry: "./src/main.js",
      plugins: () => import("@/app-form/plugins"),
    },
    tikat: {
      component: () => import("@/app-tikat/AppTikat.vue"),
      context: "/tikat",
      entry: "./src/main.js",
      plugins: () => import("@/app-tikat/plugins"),
    },
  },
});
