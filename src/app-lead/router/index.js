import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";
import DefaultLayout from "@/app-lead/layouts/default.vue";
import Dashboard from "@/app-lead/pages/dashboards/dashboard/index.vue";
import DashboardHome from "@/app-lead/pages/dashboards/home/index.vue";
import FieldsList from "@/app-lead/pages/admin/fields/list/index.vue";
import FieldsAdd from "@/app-lead/pages/admin/fields/add/[[id]].vue";
import FormsList from "@/app-lead/pages/admin/forms/list/index.vue";
import FormsAdd from "@/app-lead/pages/admin/forms/add/[[id]].vue";
import FormsPreview from "@/app-lead/pages/admin/forms/preview/index.vue";
import LeadsList from "@/app-lead/pages/admin/leads/list/index.vue";
import LeadsAdd from "@/app-lead/pages/admin/leads/add/[[id]].vue";
import StagesList from "@/app-lead/pages/admin/stages/list/index.vue";
import StagesAdd from "@/app-lead/pages/admin/stages/add/[[id]].vue";
import CampaignsList from "@/app-lead/pages/admin/campaigns/list/index.vue";
import CampaignsAdd from "@/app-lead/pages/admin/campaigns/add/[[id]].vue";
import TasksList from "@/app-lead/pages/admin/tasks/list/index.vue";

const baseRoutes = [
  {
    path: "/",
    redirect: () => {
      return { name: "dashboards-home" };
    },
  },
];

if (!routes || routes?.length < 1) {
  console.log(
    "[lead] [router] Auto-routing failed or is empty. Using fallback routes."
  );
  baseRoutes.push(
    {
      path: "/dashboards/home",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "dashboards-home",
          component: DashboardHome,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/dashboards/dashboard",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "dashboards-dashboard",
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
    {
      path: "/admin/tasks/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-tasks-list",
          component: TasksList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/stages/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-stages-list",
          component: StagesList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/stages/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-stages-add-id?",
          component: StagesAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/campaigns/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-campaigns-list",
          component: CampaignsList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/campaigns/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-campaigns-add-id?",
          component: CampaignsAdd,
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
