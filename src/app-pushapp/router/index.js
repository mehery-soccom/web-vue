import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@common/constants";
import { routes } from "vue-router/auto-routes";
import DefaultLayout from '../layouts/default.vue';
import Dashboard from '../pages/dashboards/analytics.vue';
import Events from "../pages/dashboards/events.vue";
import SequenceIndex from '../pages/dashboards/sequence/list/index.vue'
import AddSequence from "../pages/dashboards/sequence/add/[[id]].vue";
import TemplateList from '../pages/admin/app-engagements/templates/list/index.vue';
import TemplateAdd from '../pages/admin/app-engagements/templates/add/[[id]].vue';
import CampaignList from '../pages/admin/app-engagements/campaigns/list/index.vue';
import CampaignAdd from '../pages/admin/app-engagements/campaigns/add/index.vue';
import TemplateList2 from '../pages/admin/push-notification/templates/list/index.vue';
import TemplateAdd2 from '../pages/admin/push-notification/templates/add/[[id]].vue';
import CampaignList2 from '../pages/admin/push-notification/campaigns/list/index.vue';
import CampaignAdd2 from '../pages/admin/push-notification/campaigns/add/index.vue';
import ChannelsAdd from '../pages/admin/channels/add/[[id]].vue';
import ChannelsList from '../pages/admin/channels/list/index.vue';
import CohortsList from '../pages/admin/cohorts/list/index.vue';
import CohortsAdd from '../pages/admin/cohorts/add/[[id]].vue'
import LinksPageAdd from '../pages/config/library/add/[[id]].vue';
import LinksPageList from '../pages/config/library/list/index.vue';

console.log("routes", routes)
const baseRoutes = [
  {
    path: "/",
    redirect: () => ({ name: "dashboards-analytics" }),
  },
  {
    path: "/app/home",
    redirect: () => ({ name: "dashboards-analytics" }),
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
];

if (!routes || routes?.length < 3) {
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
      path: "/dashboards/events",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "dashboards-events",
          component: Events,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/dashboards/sequence/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "dashboards-sequence-list",
          component: SequenceIndex,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/dashboards/sequence/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "dashboards-sequence-add-id?",
          component: AddSequence,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/channels/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-channels-list",
          component: ChannelsList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/channels/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-channels-add-id?",
          component: ChannelsAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/cohorts/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-cohorts-list",
          component: CohortsList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/cohorts/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-cohorts-add-id?",
          component: CohortsAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/push-notification/templates/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-push-notification-templates-list",
          component: TemplateList2,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/push-notification/templates/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-push-notification-templates-add-id?",
          component: TemplateAdd2,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/app-engagements/templates/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-app-engagements-templates-list",
          component: TemplateList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/app-engagements/templates/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-app-engagements-templates-add-id?",
          component: TemplateAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/app-engagements/campaigns/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-app-engagements-campaigns-list",
          component: CampaignList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/app-engagements/campaigns/add",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-app-engagements-campaigns-add",
          component: CampaignAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/push-notification/campaigns/add",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-push-notification-campaigns-add",
          component: CampaignAdd2,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/admin/push-notification/campaigns/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "admin-push-notification-campaigns-list",
          component: CampaignList2,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/config/library/add/:id?",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "config-library-add-id?",
          component: LinksPageAdd,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
    {
      path: "/config/library/list",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "config-library-list",
          component: LinksPageList,
          props: true,
          meta: { layout: "default" },
        },
      ],
    },
  );
}

export default BootRouter.route({
  app: "pushapp",
  base: CDN_CONTEXT,
  routes: baseRoutes,
  autoRoutes: true,
  beforeEach: function (to, from, next) {
    console.log("[pushapp] [router] beforeEach");

    if (window.CONST.CONFIG && !Object.keys(window.CONST.CONFIG).length) {
      let host = window.location.host;
      let h = host.split(".");
      h.shift();
      h = h.join(".");
      let u = `https://app.${h}/common/auth/logout?_=${Date.now()}&referer=https://${host}/pushapp/`;

      window.location.href = u;
    } else {
      next();
    }
  },
});
