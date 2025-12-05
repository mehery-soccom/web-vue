export default [
  { heading: "Admin" },
  {
    title: "Analytics",
    icon: { icon: "tabler-report-search" },
    children: [
      { title: "Agent", to: "views-agent" },
      { title: "Campaign", to: "views-campaign" },
      { title: "Chat Summary", to: "views-sessions" },
      { title: "Meta", to: "views-meta" },
    ],
  },
];
