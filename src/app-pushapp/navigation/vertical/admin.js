export default [
  { heading: "Admin" },
  {
    title: "Mobile Apps",
    icon: { icon: "tabler-plug" },
    to: "admin-channels-list",
  },
  {
    title: "Push Notification",
    icon: { icon: "tabler-bell-ringing" },
    children: [
      {
        title: "Templates",
        to: "admin-push-notification-templates-list",
      },
      {
        title: "Blast",
        to: "admin-push-notification-campaigns-add",
      },
      // {
      //   title: "Trigger Rules",
      //   to: "admin-push-notification-trigger-rules-list",
      // },
      {
        title: "Campaigns",
        to: "admin-push-notification-campaigns-list",
      },
    ],
  },
  {
    title: "App Engagements",
    icon: { icon: "tabler-activity" },
    children: [
      {
        title: "Templates",
        to: "admin-app-engagements-templates-list",
      },
      {
        title: "Campaigns",
        to: "admin-app-engagements-campaigns-list",
      },
    ],
  },
];
