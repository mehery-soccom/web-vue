let localConfig = null;
function getlocalConfig() {
  if (!localConfig) {
    try {
      localConfig = require("../../config/local.json");
    } catch (e) {
      console.log("No local.json file found, using default config");
      localConfig = {};
    }
  }
  return localConfig;
}

let CONFIG = {
  getAppName() {
    let slectedAppName = window.CONST?.WEBAPP || window.CONST?.APP;

    if (slectedAppName.includes("/")) {
      slectedAppName = slectedAppName.split("/").pop();
    }

    if (!slectedAppName) {
      for (let key in this.apps) {
        let app = this.apps[key];
        if (window.location.pathname.indexOf(app.context) === 0) {
          slectedAppName = key;
          break;
        }
      }
    }

    return slectedAppName || "default"; // Read from global config
  },

  getApp(appName) {
    if (!appName) appName = this.getAppName();
    return this.apps[appName];
  },

  getAppPath(appName) {
    return "default" == appName ? "app" : `app-${appName}`;
  },

  getPublicPath(appName) {
    return this.getApp(appName)?.publicPath || "/";
  },

  getPages() {
    let pages = {};
    for (let key in this.apps) {
      let app = this.apps[key];
      pages[key] = {
        entry: app.entry || "./src/main.js",
        template: app.template || "public/index.html",
        filename: app.filename || "index.html",
        title: app.title || key,
        chunks: app.chunks || ["chunk-vendors", "chunk-common", key],
      };
    }
    return pages;
  },

  devServer() {
    let ssl = getlocalConfig()?.ssl;
    /*
    if (ssl && ssl.enabled) {
      const fs = require("fs");
      return {
        https: {
          key: fs.readFileSync("./config/ssl/key.pem"),
          cert: fs.readFileSync("./config/ssl/cert.pem"),
        },
        port: 8443,
        host: "0.0.0.0", // So it's accessible over the local network
      };
    }
    */
    return {};
  },
};

module.exports = {
  extend(config) {
    CONFIG = {
      ...CONFIG,
      ...config,
    };
    return CONFIG;
  },
  config() {
    return CONFIG;
  },
};
