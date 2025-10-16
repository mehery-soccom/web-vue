import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";
import Articles from "@/app-notebook/pages/views/articles/index.vue";
import FaqsTable from "@/app-notebook/pages/views/faqstable/index.vue";
import Dashboard from "@/app-notebook/pages/dashboards/analytics.vue";
import DefaultLayout from "@/app-notebook/layouts/default.vue";

const baseRoutes = [
  {
    path: "/",
    redirect: () => {
      return { name: "dashboards-analytics" };
    },
  },
];

if (!routes || routes?.length < 3) {
  console.log(
    "[notebook] [router] Auto-routing failed or is empty. Using fallback routes."
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
      path: "/views/articles",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "views-articles",
          component: Articles,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/views/faqstable", 
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "views-faqstable", 
          component: FaqsTable,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
  );
}

export default BootRouter.route({
  app: "notebook",
  base: CDN_CONTEXT,
  routes: baseRoutes,
  autoRoutes: true,
  beforeEach: function (to, from, next) {
    console.log("[notebook] [router] beforeEach");
    next();
  },
});
