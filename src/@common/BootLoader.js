import { createApp, defineAsyncComponent, h } from "vue";
import axios from "axios";

import BootRouter from "./BootRouter";
import BootPlugins from "./BootPlugins";
import AppWrapper from "./AppWrapper.vue";

import { REMOTE_SERVER_URL } from "@/@common/constants";

export default function Bootloader(appConfig) {
  console.log("[v3] [Bootloader] appConfig", appConfig);

  let configs = {};
  this.map = function (...apps) {
    if (apps) {
      apps.map(function (app) {
        configs[app.name || "default"] = app;
      });
    }

    return this;
  };

  let PLUGINS = {};
  this.modules = function (plugins) {
    PLUGINS = {
      ...PLUGINS,
      ...plugins,
    };
    return this;
  };

  this.setup = async function () {
    axios.defaults.withCredentials = true;
    axios.defaults.baseURL = (() => {
      return REMOTE_SERVER_URL;

      const origin = window.location.origin;
      const context = appConfig.getApp()?.context;
      return context ? origin + context : origin;
    })();
    console.log(
      "[v3] [Bootloader] setup > Axios baseURL",
      axios.defaults.baseURL
    );
  };

  this.mount = async function (appName, site = "") {
    appName = appName || appConfig.getAppName();
    let config = configs[appName] || configs.dev;

    if (config?.alias) {
      appName = config.alias;
      config = configs[appName];
    }

    if (!config) {
      throw `Cannot find app (${appName}:${site})`;
    }

    const appNameSanitized = appName.replaceAll(/[\/\\]/g, "-");
    const appPath = appName === "default" ? "app" : `app-${appNameSanitized}`;

    /* app beforeLoad */
    if (typeof config.beforeLoad === "function") {
      await config.beforeLoad();
    }

    /* app setup */
    await this.setup();

    /* import router */
    let routerMod;
    if (appConfig.getApp()?.router) {
      try {
        routerMod = await appConfig.getApp()?.router();
      } catch (error) {
        console.log("Failed to load router module");
      }
    } else {
      try {
        routerMod = await import(`@/${appPath}${site}/router`);
      } catch (error) {
        console.log("Failed to load router module");
      }
    }

    let router;
    if (routerMod) {
      router = BootRouter.router(routerMod.default);
    }

    /* import app > sync way */
    // const appComponent = await appConfig.getApp()?.component();
    // const app = createApp(appComponent.default);

    /* import app > async way */
    const appComponent = defineAsyncComponent(appConfig.getApp()?.component);
    const app = createApp({
      render() {
        return h(AppWrapper, { app: appComponent });
      },
    });

    /* Register framework plugins */
    app.use(BootPlugins);

    /* Register app plugins */
    if (appConfig.getApp()?.plugins) {
      const AppPlugins = await appConfig.getApp()?.plugins();
      app.use(AppPlugins.default);
    }

    /* backward compatibility */
    Object.entries(PLUGINS).forEach(([key, plugin]) => {
      app.use(plugin);
    });

    if (router) app.use(router);
    app.mount("#app");
  };

  for (let key in appConfig.apps) {
    let app = appConfig.apps[key];
    app.name = key;
    this.map(app);
  }
  console.log("[v3] [Bootloader] configs", configs);
}
