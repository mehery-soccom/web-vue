import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@common/constants";

export default BootRouter.route({
  app: "pushapp",
  base: CDN_CONTEXT,
  routes: [
    {
      path: "/",
      redirect: () => {
        return { name: "dashboards-analytics" };
      },
    },
    {
      path: "/app/home",
      redirect: () => {
        return { name: "dashboards-analytics" };
      },
    },
    {
      path: "/pages/user-profile",
      redirect: () => ({
        name: "pages-user-profile-tab",
        params: { tab: "profile" },
      }),
    },
    {
      path: "/pages/account-settings",
      redirect: () => ({
        name: "pages-account-settings-tab",
        params: { tab: "account" },
      }),
    },
  ],
  autoRoutes: true,
  beforeEach: function (to, from, next) {
    console.log("[pushapp] [router] beforeEach");

    next();
  },
});
