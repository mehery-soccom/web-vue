import DataService from "@/@common/services/DataService";
import { defineStore } from "pinia";

export const usePushNotificationStore = defineStore("PushNotificationStore", {
  state: () => ({
    buttonGroupList: [
      {
        label: "Yes | No",
        value: "CONFIRMATION_CATEGORY",
        fields: [
          { text: "Yes", id: "PUSHAPP_YES" },
          { text: "No", id: "PUSHAPP_NO" },
        ],
      },
      {
        label: "Accept | Reject",
        value: "RESPONSE_CATEGORY",
        fields: [
          { text: "Accept", id: "PUSHAPP_ACCEPT" },
          { text: "Reject", id: "PUSHAPP_REJECT" },
        ],
      },
      {
        label: "Subscribe | Unsubscribe",
        value: "SUBSCRIPTION_CATEGORY",
        fields: [
          { text: "Subscribe", id: "PUSHAPP_SUB" },
          { text: "Unsubscribe", id: "PUSHAPP_UNSUB" },
        ],
      },
      {
        label: "Buy | Sell",
        value: "TRANSACTION_CATEGORY",
        fields: [
          { text: "Buy", id: "PUSHAPP_BUY" },
          { text: "Sell", id: "PUSHAPP_SELL" },
        ],
      },
      {
        label: "View | Add",
        value: "CONTENT_CATEGORY",
        fields: [
          { text: "View", id: "PUSHAPP_VIEW" },
          { text: "Add", id: "PUSHAPP_ADD" },
        ],
      },
      {
        label: "Cart | Pay",
        value: "CHECKOUT_CATEGORY",
        fields: [
          { text: "Cart", id: "PUSHAPP_CART" },
          { text: "Pay", id: "PUSHAPP_PAY" },
        ],
      },
      {
        label: "Save | Submit",
        value: "FORM_ACTION_CATEGORY",
        fields: [
          { text: "Save", id: "PUSHAPP_SAVE" },
          { text: "Submit", id: "PUSHAPP_SUBMIT" },
        ],
      },
      {
        label: "Cancel | Delete",
        value: "DESTRUCTIVE_ACTION_CATEGORY",
        fields: [
          { text: "Cancel", id: "PUSHAPP_CANCEL" },
          { text: "Delete", id: "PUSHAPP_DELETE" },
        ],
      },
      {
        label: "Call | Email",
        value: "CONTACT_CATEGORY",
        fields: [
          { text: "Call", id: "PUSHAPP_CALL" },
          { text: "Email", id: "PUSHAPP_EMAIL" },
        ],
      },
      {
        label: "Buy | Sell | Later",
        value: "THREE_TRANSACTION_CATEGORY",
        fields: [
          { text: "Buy", id: "PUSHAPP_BUY" },
          { text: "Sell", id: "PUSHAPP_SELL" },
          { text: "Later", id: "PUSHAPP_LATER" },
        ],
      },
    ],
    templates: [],
    platformList: [
      { label: "IOS", value: "ios" },
      { label: "Android", value: "android" },
      { label: "Huawei", value: "huawei" },
    ],
  }),
  getters: {},
  actions: {
    // 👉 Fetch Simple Notifications
    async fetchSimpleNotifications() {
      let apiRes = await DataService.axios.get("/api/notifications");
      let res = {
        results: apiRes.data.data,
        data: {},
      };
      console.log(res);
      return res;
    },

    // 👉 Fetch Single Notification
    async fetchSimpleNotification({ id }) {
      return DataService.axios.get(`/api/notification/${id}`);
    },

    // 👉 Push Notification
    push(params) {
      return DataService.axios.post("/api/v1/notification/push", params);
    },

    // 👉 Send Styled Notification
    sendStyled(params) {
      return DataService.axios.post(
        `/api/live-activity/${params.activity_id ? "update" : "start"}`,
        params,
      );
    },

    // 👉 Create Campaign
    createCampaign(params) {
      return DataService.axios.post(`/api/v1/campaign`, params);
    },

    createScheduledCampaign(params) {
      return DataService.axios.post(`/api/v1/notification/push/schedule`, params);
    },

    // 👉 Fetch All Campaign
    fetchCampaigns(params) {
      let { page, itemsPerPage, sortBy, filters } = params;
      let sort = sortBy
        .map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
      return DataService.axios.get(`/api/v1/campaign`, {
        params: { page, limit: itemsPerPage, sort, search: filters },
      });
    },

    // 👉 Fetch Single Campaign
    fetchCampaign({ id }) {
      return DataService.axios.get(`/api/v1/campaign/${id}`);
    },

    cancelCampaign(id) {
      return DataService.axios.post(`/api/v1/notification/push/schedule/cancel`,{ campaignId: id });
    },

    // 👉 Fetch all Templates
    fetchTemplates(params) {
      if (!params) return DataService.axios.get(`/api/templates/push`);
      let { page, itemsPerPage, sortBy, filters, fields } = params;
      let sort = sortBy
        .map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
      return DataService.axios.get(`/api/templates/push`, {
        params: {
          page,
          limit: itemsPerPage,
          sort: sort || "-createdAt",
          search: filters,
          fields,
        },
      });
    },

    // 👉 Fetch single Template
    fetchTemplate({ id }) {
      return DataService.axios.get(`/api/templates/push/${id}`);
    },

    // 👉 Create Template
    createTemplate(params) {
      return DataService.axios.post("/api/templates/push", params);
    },

    // 👉 Update Template
    updateTemplate(id, params) {
      return DataService.axios.put(`/api/templates/push/${id}`, params);
    },

    // 👉 Delete Template
    deleteTemplate({ id }) {
      return DataService.axios.delete(`/api/templates/push/${id}`);
    },

    // 👉 Upload doc
    uploadDoc(params) {
      return DataService.axios.post("/api/dms", params, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },

    createSlice(params) {
      return DataService.axios.post("/api/v1/notification/push/slice", params);
    },
    fetchSlices(params) {
      let { page, itemsPerPage, sortBy, filters } = params;
      let sort = sortBy
        .map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
      return DataService.axios.get("/api/v1/notification/push/slice", {
        params: {
          page,
          limit: itemsPerPage,
          sort: sort || "-created.stamp",
          search: filters,
        },
      });
    },
    fetchSlice({ id, ...params }) {
      return DataService.axios.get(
        `/api/v1/notification/push/slice/${id}`,
        params,
      );
    },
    updateSlice({ id, ...params }) {
      return DataService.axios.put(
        `/api/v1/notification/push/slice/${id}`,
        params,
      );
    },
    deleteSlice({ id, ...params }) {
      return DataService.axios.delete(
        `/api/v1/notification/push/slice/${id}`,
        params,
      );
    },
  },
});
