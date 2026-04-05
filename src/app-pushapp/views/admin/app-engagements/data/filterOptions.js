export const FILTER_TYPES = [
  { title: "System Event", value: "event" },
  { title: "System Attribute", value: "attribute" },
  { title: "Profile Attribute", value: "additionalInfo" },
  { title: "Cohort", value: "cohort" },
];

export const FILTER_FIELDS_MAP = {
  /* Events */
  app_open: {
    type: "event",
    title: "App open",
    value: "app_open",
    inputFieldMeta: {
      type: "frequency",
      required: true,
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

  /* Business Events */
  // fetch from api

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

  /* Profile Attributes */
  // fetch from api

  /* Cohorts */
  // fetch from api
};

export const FILTER_OPERATORS = [
  { value: "EQ", title: "Equals", text: "= (equals)", sign: "=" },
  {
    value: "NOT_EQ",
    title: "Not equals",
    text: "!= (not equals)",
    sign: "!=",
  },

  {
    value: "ANY_MATCH",
    title: "Contains",
    text: "~ (contains)",
    sign: "~",
    strictApplicableTypes: ["text"],
  },
  {
    value: "STARTS_WITH",
    title: "Starts With",
    text: "^= (starts with)",
    sign: "^=",
    strictApplicableTypes: ["text"],
  },
  {
    value: "ENDS_WITH",
    title: "Ends With",
    text: "$= (ends with)",
    sign: "$=",
    strictApplicableTypes: ["text"],
  },

  {
    value: "less_than",
    title: "Less than",
    text: "< (less than)",
    sign: "<",
    strictApplicableTypes: ["number", "frequency"],
  },
  {
    value: "less_than_or_equal",
    title: "Less than or equal",
    text: "<= (less than or equal)",
    sign: "<=",
    strictApplicableTypes: ["number", "frequency"],
  },
  {
    value: "more_than",
    title: "More than",
    text: "> (more than)",
    sign: ">",
    strictApplicableTypes: ["number", "frequency"],
  },
  {
    value: "more_than_or_equal",
    title: "More than or equal",
    text: ">= (more than or equal)",
    sign: ">=",
    strictApplicableTypes: ["number", "frequency"],
  },

  {
    value: "IN",
    title: "In",
    text: "∈ (in list)",
    sign: "∈",
    expects: "array",
    strictApplicableTypes: ["select"],
  },
  {
    value: "NOT_IN",
    title: "Not In",
    text: "∉ (not in list)",
    sign: "∉",
    expects: "array",
    strictApplicableTypes: ["select"],
  },

  {
    value: "AFTER",
    title: "After",
    text: "> (after)",
    sign: ">",
    strictApplicableTypes: ["date"],
  },
  {
    value: "BEFORE",
    title: "Before",
    text: "< (before)",
    sign: "<",
    strictApplicableTypes: ["date"],
  },
  {
    value: "ON",
    title: "On",
    text: "~ (yearly on)",
    sign: "~",
    strictApplicableTypes: ["date"],
  },
  {
    value: "ON_OR_AFTER",
    title: "On or After",
    text: ">= (on or after)",
    sign: ">=",
    strictApplicableTypes: ["date"],
  },
  {
    value: "ON_OR_BEFORE",
    title: "On or Before",
    text: "<= (on or before)",
    sign: "<=",
    strictApplicableTypes: ["date"],
  },
  {
    value: "BETWEEN",
    title: "Between",
    text: "<> (between)",
    sign: "<>",
    strictApplicableTypes: ["date"],
  },
];

export const FILTER_PERIODS = [
  { title: "Today", value: "today" },
  { title: "Yesterday", value: "yesterday" },
  { title: "In last 7 days", value: "last_7_days" },
  { title: "In last 30 days", value: "last_30_days" },
];
