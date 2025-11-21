import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import Dashboard from "@/app-insights360/pages/dashboards/analytics.vue";
import Agent from "@/app-insights360/pages/views/agent/index.vue";
import Meta from "@/app-insights360/pages/views/meta/index.vue";
import Sessions from "@/app-insights360/pages/views/sessions/index.vue";
import Campaign from "@/app-insights360/pages/views/campaign/index.vue";
import Outbound from "@/app-insights360/pages/views/outbound/[id].vue";
import Cta from "@/app-insights360/pages/views/cta/[id].vue";
import DefaultLayout from "@/app-insights360/layouts/default.vue";

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
      path: "/views/campaign",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "views-campaign",
          component: Campaign,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/views/agent",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "views-agent",
          component: Agent,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/views/sessions",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "views-sessions",
          component: Sessions,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/views/meta",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "views-meta",
          component: Meta,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/views/outbound/:id", 
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "views-outbound-id", 
          component: Outbound,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/views/cta/:id", 
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "views-cta-id", 
          component: Cta,
          props: true, 
          meta: { layout: "default" },
        },
      ],
    },
  ],
  autoRoutes: true,
  beforeEach: function (to, from, next) {
    console.log("[insights360] [router] beforeEach");

    next();
  },
});
