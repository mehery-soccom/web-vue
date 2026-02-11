import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";

console.log("offsite routes", routes);

export default BootRouter.route({
  app: "offsite",
  base: CDN_CONTEXT,
  routes: [],
  autoRoutes: false,
  beforeEach: function (to, from, next) {
    console.log("[offsite] [router] beforeEach");

    next();
  },
});
