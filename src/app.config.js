const AppConfig = require("@/@common/AppConfig");

module.exports = AppConfig.extend({
  apps: {
    default: {
      component: () => import("@/app/App.vue"),
      router: () => import("@/app/router"),
      context: "/",
      entry: "./src/main.js",
    },
    // chat: {
    //   component: () => import("@/app-chat/AppChat.vue"),
    //   context: "/chat",
    //   entry: "./src/main.js",
    // },
    // scriptus: {
    //   component: () => import("@/app-scriptus/AppScriptus.vue"),
    //   context: "/scriptus",
    //   entry: "./src/main.js",
    // },
    // tuber: {
    //   component: () => import("@/app-tuber/AppTuber.vue"),
    //   context: "/tuber",
    //   entry: "./src/main.js",
    // },
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
  },
});
