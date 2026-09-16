export default [
  { heading: "Admin" },
  {
    title: "Analytics",
    icon: { icon: "tabler-report-search" },
    children: [
      { title: "Agent", to: "views-agent" },
      { title: "Campaign", to: "views-campaign" },
      { title: "Chat Summary", to: "views-sessions" },
      // { title: "Botflow Summary", to: "views-botflow" },
      { title: "Meta", to: "views-meta" },
      { title: "Reports", to: "views-reports" },
    ],
  },
];
