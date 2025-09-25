const { defineConfig } = require("@vue/cli-service");
const path = require("path");
const fs = require("fs");
const AutoImport = require("unplugin-auto-import/webpack");
const Components = require("unplugin-vue-components/webpack");

const VueRouterPlugin = require("unplugin-vue-router/webpack");
const { VueRouterAutoImports } = require("unplugin-vue-router");

const { VuetifyPlugin } = require("webpack-plugin-vuetify");
const { Vuetify3Resolver } = require("unplugin-vue-components/resolvers");

let apps = fs
  .readdirSync("./src")
  .filter((f) => f === "app" || f.startsWith("app-"));
let pages_dirs = [];
apps.map((a) => {
  let _a = a.replace("-", "_");
  pages_dirs.push({
    src: `src/${a}/pages`,
    path: `__${_a}__`,
  });
});

process.env.VUE_APP_VERSION = require("./package.json").version;
process.env.VUE_APP_TIMESTAMP = Date.now();
const appName = process.env.VUE_APP_NAME || "default";

console.log("webpack", {});
module.exports = defineConfig({
  publicPath: process.env.NODE_ENV === "production" ? "./" : "/",

  transpileDependencies: true,
  runtimeCompiler: true,
  productionSourceMap: false,
  filenameHashing: false,

  css: {
    loaderOptions: {
      scss: {
        // This is the key part for `@use` to resolve node_modules
        sassOptions: {
          includePaths: [path.resolve(__dirname, "node_modules")],
        },
      },
    },
  },

  configureWebpack: {
    optimization: {
      splitChunks: {
        chunks: "all",
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@common": path.resolve(__dirname, "src/@common"),

        apexcharts: path.resolve(
          __dirname,
          "node_modules/apexcharts-clevision"
        ),

        "@app": path.resolve(__dirname, "src/app"),
        "@app-pushapp": path.resolve(__dirname, "src/app-pushapp"),
        "@app-insights360": path.resolve(__dirname, "src/app-insights360"),
        "@app-notebook": path.resolve(__dirname, "src/app-notebook"),
        "@app-lead": path.resolve(__dirname, "src/app-lead"),
      },
    },
    plugins: [
      new VuetifyPlugin({
        autoImport: true,
        styles: {
          configFile:
            "src/app-pushapp/@core/scss/template/libs/vuetify/_variables.scss",
        },
      }),
      AutoImport({
        imports: [
          "vue",
          // "vue-router",
          VueRouterAutoImports,
          "@vueuse/core",
          "@vueuse/math",
          "pinia",
        ],
        dts: false,
      }),
      Components({
        dirs: [
          "src/@common/components",

          "src/app-pushapp/@core/components",
          "src/app-pushapp/views/demos",
          "src/app-pushapp/components",
        ],
        resolvers: [Vuetify3Resolver()],
        dts: false,
      }),
      VueRouterPlugin({
        routesFolder: pages_dirs,
      }),
    ],
    module: {
      rules: [
        {
          resourceQuery: /raw/, // *.svg?raw
          type: "asset/source",
        },
        {
          test: /\.mjs$/,
          include: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
          type: "javascript/auto",
        },
      ],
    },
  },

  chainWebpack: (config) => {
    if (config.plugins.has("extract-css")) {
      config.plugin("extract-css").tap((args) => {
        args[0].ignoreOrder = true;
        return args;
      });
    }
  },

  lintOnSave: false,
});
