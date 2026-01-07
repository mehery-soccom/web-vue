import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";
import DefaultLayout from "@/app-tikat/layouts/default.vue";
import Dashboard from "@/app-tikat/pages/dashboards/analytics.vue";
import FieldsList from "@/app-tikat/pages/setup/fields/list/index.vue";
import FieldsAdd from "@/app-tikat/pages/setup/fields/add/[[id]].vue";
import StatusFeedbackList from "@/app-tikat/pages/setup/status/feedback/list/index.vue";
import StatusFeedbackAdd from "@/app-tikat/pages/setup/status/feedback/add/[[id]].vue";
import FormsFeedbackList from "@/app-tikat/pages/setup/forms/feedback/list/index.vue";
import FormsFeedbackAdd from "@/app-tikat/pages/setup/forms/feedback/add/[[id]].vue";
import FormsFeedbackPreview from "@/app-tikat/pages/setup/forms/feedback/preview/index.vue";

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
    {
      path: "/setup/status/feedback/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "setup-status-feedback-list",
          component: StatusFeedbackList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/setup/status/feedback/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "setup-status-feedback-add-id?",
          component: StatusFeedbackAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/setup/forms/feedback/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "setup-forms-feedback-list",
          component: FormsFeedbackList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/setup/forms/feedback/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "setup-forms-feedback-add-id?",
          component: FormsFeedbackAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/setup/forms/feedback/preview",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "setup-forms-feedback-preview",
          component: FormsFeedbackPreview,
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
