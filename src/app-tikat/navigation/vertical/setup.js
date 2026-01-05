export default [
  { heading: "Setup" },
  {
    title: "Fields",
    icon: { icon: "tabler-plug" },
    to: "setup-fields-list",
  },
  {
    title: "Stages",
    icon: { icon: "tabler-chart-bar-popular" },
    children: [
      { title: "Feedback", to: "setup-status-feedback-list" },
    ],
  },
]