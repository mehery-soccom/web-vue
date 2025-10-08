export const optionsMap = {
  /* Events */
  app_open: {
    type: "event",
    title: "App open",
    value: "app_open",
    freqFieldMeta: {
      required: false,
    },
  },
  page_open: {
    type: "event",
    title: "Page open",
    value: "page_open",
    inputFieldMeta: {
      type: "select",
      options: "/api/v1/catalog/pages/options",
    },
  },
  widget_open: {
    type: "event",
    title: "Placeholder",
    value: "widget_open",
    inputFieldMeta: {
      type: "select",
      options: "/api/v1/catalog/placeholders/options",
    },
  },

  /* Attributes */
  platform: {
    type: "attribute",
    title: "Platform",
    value: "platform",
    inputFieldMeta: {
      type: "select",
      multiple: true,
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
