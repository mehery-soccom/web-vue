import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";
import DefaultLayout from "@/app-lead/layouts/default.vue";
import Dashboard from "@/app-lead/pages/dashboards/analytics.vue";
import FieldsList from "@/app-lead/pages/admin/fields/list/index.vue";
import FieldsAdd from "@/app-lead/pages/admin/fields/add/[[id]].vue";
import FormsList from "@/app-lead/pages/admin/forms/list/index.vue";
import FormsAdd from "@/app-lead/pages/admin/forms/add/[[id]].vue";
import FormsPreview from "@/app-lead/pages/admin/forms/preview/index.vue";
import LeadsList from "@/app-lead/pages/admin/leads/list/index.vue";
import LeadsAdd from "@/app-lead/pages/admin/leads/add/[[id]].vue";

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
    "[lead] [router] Auto-routing failed or is empty. Using fallback routes."
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
      path: "/admin/fields/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-fields-list",
          component: FieldsList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/fields/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-fields-add-id?",
          component: FieldsAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/forms/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-forms-list",
          component: FormsList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/forms/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-forms-add-id?",
          component: FormsAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/forms/preview",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-forms-preview",
          component: FormsPreview,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/leads/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-leads-list",
          component: LeadsList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/leads/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-leads-add-id?",
          component: LeadsAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
  );
}

export default BootRouter.route({
  app: "lead",
  base: CDN_CONTEXT,
  routes: baseRoutes,
  autoRoutes: true,
  beforeEach: function (to, from, next) {
    console.log("[lead] [router] beforeEach");
    next();
  },
});
