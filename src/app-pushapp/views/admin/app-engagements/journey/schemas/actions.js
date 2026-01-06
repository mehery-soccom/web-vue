export const ActionRegistry = {
  SEND_MESSAGE: {
    label: "Send a Message",
    fields: [
      {
        key: "appId",
        label: "App",
        type: "autocomplete",
        required: true,
        cols: 4,
        options: "/common/api/config/clientapikey",
        optionsPreload: true,
        optionsGenerator: (res) =>
          res.results.map((a) => ({
            title: a.queue,
            value: a._id,
          })),
      },
      {
        key: "channelId",
        label: "Channel",
        type: "autocomplete",
        required: true,
        cols: 4,
        options: "/common/pub/v1/options/channels?contactType=WHATSAPP",
        optionsPreload: true,
        optionsGenerator: (res) =>
          res.results.map((a) => ({
            title: a.name,
            value: a._id,
            data: {
              contactType: a.contactType,
            },
          })),
      },
      {
        key: "templateCode",
        label: "Template",
        type: "autocomplete",
        required: true,
        cols: 4,
        options:
          "/common/api/v1/tmpl/hsm?search[contactType]={{data.channelId.contactType}}",
        optionsPreload: true,
        dependsOn: ["channelId"],
        optionsGenerator: (res) =>
          res.results.map((a) => ({
            title: a.name,
            value: a.code,
          })),
      },
    ],

    toServer(config) {
      return {
        code: "SEND_MESSAGE",
        attrs: {
          appId: config.appId,
          channelId: config.channelId,
          template: {
            code: config.templateCode,
            data: {},
          },

          type: "template",
          options: {},
        },
      };
    },

    fromServer(attrs) {
      return {
        appId: attrs.appId,
        channelId: attrs.channelId,
        template: attrs.template || { code: null },

        type: attrs.type || "template",
        options: attrs.options || {},
      };
    },
  },
};
