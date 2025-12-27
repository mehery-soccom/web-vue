import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";
import Call from "@/app-phone/pages/call/index.vue";
import Dialer from "@/app-phone/pages/dialer/index.vue";
import BlankLayout from "@/app-phone/layouts/blank.vue";

console.log("phone routes", routes)
export default BootRouter.route({
  app: "phone",
  base: CDN_CONTEXT,
  routes: [
    {
      path: "/",
      redirect: () => {
        return { name: "dialer" };
      },
    },
    {
      path: "/dialer",
      component: BlankLayout,
      children: [
        {
          path: "",
          name: "dialer",
          component: Dialer,
          props: true,
          meta: { layout: "blank" },
        },
      ],
    },
    {
      path: "/call",
      component: BlankLayout,
      children: [
        {
          path: "",
          name: "call",
          component: Call,
          props: true, 
          meta: { layout: "blank" },
        },
      ],
    },
    // {
    //   path: "/views/cta/:id", 
    //   component: DefaultLayout,
    //   children: [
    //     {
    //       path: "",
    //       name: "views-cta-id", 
    //       component: Cta,
    //       props: true, 
    //       meta: { layout: "default" },
    //     },
    //   ],
    // },
  ],
  autoRoutes: false,
  beforeEach: function (to, from, next) {
    console.log("[phone] [router] beforeEach");

    next();
  },
});
