export default [
  { heading: "Setup" },
  {
    title: "Fields",
    icon: { icon: "tabler-plug" },
    to: "setup-fields-list",
  },
  {
    title: "Forms",
    icon: { icon: "tabler-clipboard-text" },
    children: [
      { title: "Feedback", to: "setup-forms-feedback-list" },
    ],
  },
  {
    title: "Stages",
    icon: { icon: "tabler-chart-bar-popular" },
    children: [
      { title: "Feedback", to: "setup-status-feedback-list" },
    ],
  },
]