import DataService from "@/@common/services/DataService";
import { defineStore } from "pinia";

const PERSISTENT_CHAT_URL = "/nexuz/agentic/api/v1/persistentChat";

const parseSseBlock = (raw) => {
  let event = "message";
  const dataLines = [];
  raw.split("\n").forEach((line) => {
    if (!line || line.startsWith(":")) return;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  });
  if (!dataLines.length) return null;
  const dataText = dataLines.join("\n");
  let data = dataText;
  try {
    data = JSON.parse(dataText);
  } catch (e) {
    data = dataText;
  }
  return { event, data };
};

const readCampaignChatEvents = async (response, onEvent) => {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flush = (block) => {
    const evt = parseSseBlock(block);
    if (evt) onEvent?.(evt);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let splitAt = buffer.indexOf("\n\n");
    while (splitAt !== -1) {
      flush(buffer.slice(0, splitAt));
      buffer = buffer.slice(splitAt + 2);
      splitAt = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) flush(buffer);
};
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
      let { page, itemsPerPage, sortBy, filters, dateRange1, dateRange2, timezone } = params;
      let sort = sortBy
        .map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
      return DataService.axios.get(`/api/v1/campaign`, {
        params: { page, limit: itemsPerPage, sort, search: filters, dateRange1, dateRange2, timezone },
      });
    },

    // 👉 Fetch Single Campaign
    fetchCampaign({ id }) {
      return DataService.axios.get(`/api/v1/campaign/${id}`);
    },

    fetchCampaignStats(params) {
      let { dateRange1, dateRange2, timezone } = params;
      return DataService.axios.get(`/api/v1/campaign/stats`, {
        params: { dateRange1, dateRange2, timezone },
      });
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

    /** POST a chat message as an event stream. First call: sessionId null. Later: include sessionId. */
    async postCampaignAssistantMessage({ sessionId = null, text, onEvent, signal }) {
      const tenant =
        window.CONST?.CONFIG?.SETUP?.TENANT ||
        window.CONST?.CONFIG?.tenant ||
        "demo";
      const url = new URL(
        PERSISTENT_CHAT_URL,
        window.location.origin,
      );
      url.searchParams.set("tnt", tenant);

      const response = await fetch(url.toString(), {
        method: "POST",
        credentials: "include",
        signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({ sessionId, text }),
      });

      if (!response.ok) {
        let data = {};
        try {
          data = await response.json();
        } catch (e) {
          data = {};
        }
        const error = new Error("Failed to send message");
        error.response = { data };
        throw error;
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await response.json();
        onEvent?.({ event: "done", data: body?.data || body });
        return body;
      }

      await readCampaignChatEvents(response, onEvent);
      return null;
    },

    /** GET / poll session messages by sessionId */
    fetchCampaignAssistantSession(sessionId) {
      return DataService.axios.get(PERSISTENT_CHAT_URL, 
        { params: { sessionId, tnt: window.CONST?.CONFIG?.SETUP?.TENANT || window.CONST?.CONFIG?.tenant || "demo" }, 
          skipApiContext: true, toast: false });
    },

    /** POST / initialize AI form state for a chat session (call once before polling GET) */
    initCampaignAiFormState(sessionId) {
      return DataService.axios.post("/api/v1/ai-form-state",{ sessionId, feature: "campaign" });
    },

    /** GET / poll AI form state (template, audience, schedule) by sessionId */
    fetchCampaignAiFormState(sessionId) {
      return DataService.axios.get(`/api/v1/ai-form-state/${sessionId}`);
    },
  },
});
