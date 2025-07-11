import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";

export default BootRouter.route({
  app: "notebook",
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
    console.log("[notebook] [router] beforeEach");

    next();
  },
});
