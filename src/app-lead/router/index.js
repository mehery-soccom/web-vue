import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";

export default BootRouter.route({
  app: "lead",
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
    console.log("[lead] [router] beforeEach");

    next();
  },
});
