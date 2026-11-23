export default [
  { heading: "Config" },
  {
    title: "Setup",
    icon: { icon: "tabler-tools" },
    to: "config-setup-list",
  },
  {
    title: "Mobile Apps",
    icon: { icon: "tabler-plug" },
    to: "admin-channels-list",
  },
  {
    title: "Event Master",
    icon: { icon: "tabler-database" },
    to: "config-event-master-list",
  },
  {
    title: "Library",
    icon: { icon: "tabler-books" },
    to: "config-library-list",
  },
  {
    title: "Usage",
    icon: { icon: "tabler-chart-bar" },
    to: "admin-usage",
    requiresAgenticAi: true,
  },
  {
    title: "Api Creds",
    icon: { icon: "tabler-key" },
    to: "config-apicredentials-list",
  },
];
