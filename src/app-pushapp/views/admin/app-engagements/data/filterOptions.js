export const optionTypes = [
  { title: "System Event", value: "event" },
  { title: "System Attribute", value: "attribute" },
  { title: "Profile Attribute", value: "additionalInfo" },
  { title: "Profile Cohort", value: "cohort" },
];

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

  /* Profile Cohorts */
  // fetch from api
};

export const operatorsMaster = [
  // for type string & number
  { value: "EQ", title: "Equals", text: "= (equals)", sign: "=" },
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
    value: "END_WITH",
    title: "Ends With",
    text: "$= (ends with)",
    sign: "$=",
    strictApplicableTypes: ["text"],
  },

  { value: "equals", title: "Equals", text: "= (equals)", sign: "=" },
  {
    value: "not_equals",
    title: "Not equals",
    text: "!= (not equals)",
    sign: "!=",
  },
  { value: "is", title: "Is", text: "= (is)", sign: "=" },
  { value: "is_not", title: "Is not", text: "!= (is not)", sign: "!=" },
  { value: "exactly", title: "Exactly", text: "= (exactly)", sign: "=" },
  {
    value: "less_than",
    title: "Less than",
    text: "< (less than)",
    sign: "<",
    strictApplicableTypes: ["number"],
  },
  {
    value: "more_than",
    title: "More than",
    text: "> (more than)",
    sign: ">",
    strictApplicableTypes: ["number"],
  },

  // for type date
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
export const eventOperators = [
  { title: "Is", value: "is" },
  { title: "Is not", value: "is_not" },
];
export const attributeOperators = [
  { title: "Equals", value: "equals" },
  { title: "Not equals", value: "not_equals" },
];
export const profileAttributeOperators = [
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
