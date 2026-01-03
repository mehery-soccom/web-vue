import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";
import DefaultLayout from "@/app-tikat/layouts/default.vue";
import Dashboard from "@/app-tikat/pages/dashboards/analytics.vue";
import FieldsList from "@/app-tikat/pages/setup/fields/list/index.vue";
import FieldsAdd from "@/app-tikat/pages/setup/fields/add/[[id]].vue";

const baseRoutes = [
  {
    path: "/",
    redirect: () => {
      return { name: "dashboards-analytics" };
    },
  },
];

if (!routes || routes?.length < 1) {
  console.log(
    "[tikat] [router] Auto-routing failed or is empty. Using fallback routes."
  );
  baseRoutes.push(
    {
      path: "/dashboards/analytics",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "dashboards-analytics",
          component: Dashboard,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/setup/fields/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "setup-fields-list",
          component: FieldsList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/setup/fields/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "setup-fields-add-id?",
          component: FieldsAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    
  );
}

export default BootRouter.route({
  app: "tikat",
  base: CDN_CONTEXT,
  routes: baseRoutes,
  autoRoutes: true,
  beforeEach: function (to, from, next) {
    console.log("[tikat] [router] beforeEach");
    next();
  },
});
