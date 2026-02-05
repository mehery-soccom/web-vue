export const ListenerRegistry = {
  deliveryTimeout: {
    label: "Listen to Delivery Timeout",
    desc: "If Delivery did not happen within the given time",
    code: "TIMEOUT",
    attrsKey: "deliveryTimeout",
    fields: [
      {
        key: "timeout",
        label: "Timeout",
        type: "duration",
        default: { value: 5, unit: "mins" },
        required: true,
        cols: 3,
        units: [
          { title: "mins", value: "mins" },
          { title: "hrs", value: "hrs" },
        ],
        min: {
          mins: 1,
          hrs: 1,
        },
        max: {
          mins: 120,
          hrs: 24,
        },
      },
    ],
  },

  ctaTimeout: {
    label: "Listen to CTA Timeout",
    desc: "If CTA did not occur within the given time",
    code: "TIMEOUT",
    attrsKey: "ctaTimeout",
    fields: [
      {
        key: "timeout",
        label: "Timeout",
        type: "duration",
        default: { value: 5, unit: "mins" },
        required: true,
        cols: 3,
        units: [
          { title: "mins", value: "mins" },
          { title: "hrs", value: "hrs" },
        ],
        min: {
          mins: 1,
          hrs: 1,
        },
        max: {
          mins: 120,
          hrs: 24,
        },
      },
    ],
  },
};
