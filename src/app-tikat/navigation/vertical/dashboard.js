export default [
  {
      title: "Home",
      icon: { icon: "tabler-smart-home" },
      to: "dashboards-home",
  },
  {
    title: "Dashboard",
    icon: { icon: "tabler-smart-home" },
    children: [
      {
        title: "Feedback Analytics",
        to: "dashboards-analytics-feedback",
      },
    ],
    // badgeContent: "3",
    // badgeClass: "bg-primary",
  },
];
