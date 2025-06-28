import { createRouter, createWebHistory } from "vue-router";
import AppConfig from "./AppConfig";
import { routes } from "vue-router/auto-routes";

export default {
  _inst_: null,
  instance() {
    return this._inst_;
  },

  options: {},
  route: function (options) {
    let appName = AppConfig.config().getAppName();
    console.log("[v3] [BootRouter] route →", options);

    if (options.app == appName) {
      this.options = {
        ...options,
        routes: [
          ...options.routes,
          ...(options.autoRoutes ? this.getAutoRoutes(options.app) : []),
        ],
      };
    }

    return { options };
  },

  router: function (_router) {
    const appName = AppConfig.config().getAppName();
    const options = this.options;
    console.log("[v3] [BootRouter] router →", { appName, options });

    const router = createRouter({
      history: createWebHistory(options.base || "/"),
      scrollBehavior:
        options.scrollBehavior ||
        (() => ({ left: 0, top: 0, behavior: "smooth" })),
      routes: options.routes || [],
    });

    options.beforeEach =
      options.beforeEach ||
      function (to, from, next) {
        next();
      };

    options.accessDenied =
      options.accessDenied ||
      function (to, from, next) {
        next(false);
      };

    options.matchNotFound =
      options.matchNotFound ||
      function (to, from, next) {
        if (options.matchNotFoundExternal) {
          document.location.href = to.fullPath;
        } else {
          next();
        }
      };

    router.beforeEach((to, from, next) => {
      if (!to.matched.length) {
        console.log("[v3] [BootRouter] forwarding to matchNotFound →", to.path);
        options.matchNotFound(to, from, next);
      } else if (
        !to.matched.some((record) => {
          if (!record.meta?.role || !window.CONST?.APP_USER_ROLE) return true;
          const requiredRoles = Array.isArray(record.meta.role)
            ? record.meta.role
            : [record.meta.role];
          const userRoles = Array.isArray(window.CONST.APP_USER_ROLE)
            ? window.CONST.APP_USER_ROLE
            : [window.CONST.APP_USER_ROLE];

          return requiredRoles.some((role) => userRoles.includes(role));
        })
      ) {
        console.log("[v3] [BootRouter] forwarding to accessDenied →", to.path);
        options.accessDenied(to, from, next);
      } else {
        console.log("[v3] [BootRouter] forwarding to beforeEach →", to.path);
        options.beforeEach(to, from, next);
      }
    });

    this._inst_ = router;

    return router;
  },

  getAutoRoutes: function (app) {
    console.log("[v3] [BootRouter] getAutoRoutes", routes);
    if (!routes?.length) {
      console.log("[v3] [BootRouter] getAutoRoutes : No auto routes found");
      return [];
    }

    const _routes = this.flattenRoutes(routes).filter((r) => {
      return r.appName === `app_${app}`;
    });
    /*
    console.log(_routes);
    {
        "name": "apps-invoice-list",
        "path": "/apps/invoice/list",
        "component": () => import("path-to-component")
    }
    */

    const routesWithLayout = this.setupLayouts(_routes, app);
    /*
    console.log(routesWithLayout);
    {
        "path": "/apps/invoice/list",
        "component": () => import("path-to-layout"),
        "children": [
            {
                // `component` will be rendered inside `layout's` <router-view>, when /apps/invoice/list is matched
                "name": "apps-invoice-list",
                "path": "",
                "component": () => import("path-to-component"),
                "props": true, // route.params are passed as props to component
                "meta": {}
            }
        ]
    }
    */

    return routesWithLayout;
  },

  flattenRoutes: function (arr, basePath = "", inheritedAppName = null) {
    const flat = [];

    for (const route of arr) {
      const rawPath = route.path || "";
      let fullPath = `${basePath}/${rawPath}`.replace(/\/+/g, "/");
      if (fullPath !== "/" && fullPath.endsWith("/")) {
        fullPath = fullPath.slice(0, -1);
      }

      let appName = inheritedAppName;

      const match = fullPath.match(/^\/__([^\/]+)__/);
      if (match) {
        appName = match[1];
        fullPath = fullPath.replace(`/__${appName}__`, "") || "/";
      }

      if (!fullPath.startsWith("/")) {
        fullPath = "/" + fullPath;
      }

      const hasChildren =
        Array.isArray(route.children) && route.children.length > 0;
      const hasComponent =
        typeof route.component === "string" ||
        typeof route.component === "function";

      if (!hasChildren && hasComponent) {
        const cleanName = fullPath
          .replace(/^\//, "")
          .replace(/\//g, "-")
          .replace(/\[|\]/g, "")
          .replace(/:/g, "")
          .toLowerCase();

        const fullName = `${cleanName || "index"}`;

        flat.push({
          path: fullPath,
          name: fullName,
          props: true,
          component: route.component,
          ...(route.meta ? { meta: route.meta } : {}),
          ...(appName ? { appName } : {}),
        });
      }

      if (hasChildren) {
        flat.push(...this.flattenRoutes(route.children, fullPath, appName));
      }
    }

    return flat;
  },

  setupLayouts: function (arr, app) {
    return arr.map((route) => {
      return {
        path: route.path,
        meta: route.meta,
        component: () =>
          import(
            `../${app === "app" ? "app" : "app-" + app}/layouts/${
              route.meta?.layout || "default"
            }.vue`
          ),
        children: route.path === "/" ? [route] : [{ ...route, path: "" }],
      };
    });
  },
};
