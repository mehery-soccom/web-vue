import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";

export default BootRouter.route({
  app: "insights360",
  base: CDN_CONTEXT,
  routes: [
    {
      path: "/",
      redirect: () => {
        return { name: "dashboards-analytics" };
      },
    },
  ],
  autoRoutes: true,
  beforeEach: function (to, from, next) {
    console.log("[insights360] [router] beforeEach");

    next();
  },
});
