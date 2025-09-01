export const optionsMap = {
  /* Events */
  app_open: {
    type: "event",
    title: "App open",
    value: "app_open",
    freqFieldMeta: true,
  },
  page_open: {
    type: "event",
    title: "Page open",
    value: "page_open",
    inputFieldMeta: {
      type: "select",
      options: [{ title: "Login", value: "login" }],
    },
  },
  page_close: { type: "event", title: "Page close", value: "page_close" },
  widget_open: {
    type: "event",
    title: "widget open",
    value: "widget_open",
    inputFieldMeta: {
      type: "text",
    },
  },
  widget_close: { type: "event", title: "Widget close", value: "widget_close" },

  /* Attributes */
  platform: {
    type: "attribute",
    title: "Platform",
    value: "platform",
    inputFieldMeta: {
      type: "select",
      options: [
        { title: "iOS", value: "ios" },
        { title: "Android", value: "android" },
      ],
    },
  },
};

export const eventOperators = [
  { title: "Is", value: "is" },
  { title: "Is not", value: "is_not" },
];
export const attributeOperators = [
  { title: "Equals", value: "equals" },
  { title: "Not equals", value: "not_equals" },
];
export const freqOperators = [
  { title: "Exactly", value: "exactly" },
  { title: "Less than", value: "less_than" },
  { title: "More than", value: "more_than" },
];

export const freqPeriods = [
  { title: "Today", value: "today" },
  { title: "Yesterday", value: "yesterday" },
  { title: "In last 7 days", value: "last_7_days" },
  { title: "In last 30 days", value: "last_30_days" },
];
