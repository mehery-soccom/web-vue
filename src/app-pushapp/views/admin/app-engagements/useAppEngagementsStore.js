import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useAppEngagementsStore = defineStore("AppEngagementsStore", {
  state: () => ({
    buttonGroupList: [
      {
        label: "Yes | No",
        value: "CONFIRMATION_CATEGORY",
        children: [
          {
            id: "PUSHAPP_YES",
            text: "Yes",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            id: "PUSHAPP_NO",
            text: "No",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          // { text: "Yes", id: "PUSHAPP_YES" },
          // { text: "No", id: "PUSHAPP_NO" },
        ],
      },
      {
        label: "Accept | Reject",
        value: "RESPONSE_CATEGORY",
        children: [
          {
            text: "Accept",
            id: "PUSHAPP_ACCEPT",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            text: "Reject",
            id: "PUSHAPP_REJECT",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
        ],
      },
      {
        label: "Subscribe | Unsubscribe",
        value: "SUBSCRIPTION_CATEGORY",
        children: [
          {
            text: "Subscribe",
            id: "PUSHAPP_SUB",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            text: "Unsubscribe",
            id: "PUSHAPP_UNSUB",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
        ],
      },
      {
        label: "Buy | Sell",
        value: "TRANSACTION_CATEGORY",
        children: [
          {
            text: "Buy",
            id: "PUSHAPP_BUY",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            text: "Sell",
            id: "PUSHAPP_SELL",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
        ],
      },
      {
        label: "View | Add",
        value: "CONTENT_CATEGORY",
        children: [
          {
            text: "View",
            id: "PUSHAPP_VIEW",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            text: "Add",
            id: "PUSHAPP_ADD",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
        ],
      },
      {
        label: "Cart | Pay",
        value: "CHECKOUT_CATEGORY",
        children: [
          {
            text: "Cart",
            id: "PUSHAPP_CART",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            text: "Pay",
            id: "PUSHAPP_PAY",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
        ],
      },
      {
        label: "Save | Submit",
        value: "FORM_ACTION_CATEGORY",
        children: [
          {
            text: "Save",
            id: "PUSHAPP_SAVE",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            text: "Submit",
            id: "PUSHAPP_SUBMIT",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
        ],
      },
      {
        label: "Cancel | Delete",
        value: "DESTRUCTIVE_ACTION_CATEGORY",
        children: [
          {
            text: "Cancel",
            id: "PUSHAPP_CANCEL",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            text: "Delete",
            id: "PUSHAPP_DELETE",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
        ],
      },
      {
        label: "Call | Email",
        value: "CONTACT_CATEGORY",
        children: [
          {
            text: "Call",
            id: "PUSHAPP_CALL",
            name: "",
            path: "style.button1_url",
            type: "text",
            label: "Button URL -> 1",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
          {
            text: "Email",
            id: "PUSHAPP_EMAIL",
            name: "",
            path: "style.button2_url",
            type: "text",
            label: "Button URL -> 2",
            placeholder: "Enter URL",
            required: true,
            readonly: false,
            defaultValue: null,
          },
        ],
      },
    ],
  }),
  getters: {},
  actions: {
    // 👉 Fetch something
    fetchSomething({ id }) {
      return DataService.axios.get(`/api/something/${id}`);
    },
    createTemplate(params) {
      return DataService.axios.post("/api/templates/in-app", params);
    },
    createFilter(params) {
      return DataService.axios.post(
        "/api/v1/notification/in-app/filter",
        params
      );
    },
    fetchFilters(params) {
      let { page, itemsPerPage, sortBy, filters } = params;
      let sort = sortBy
        .map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
      return DataService.axios.get("/api/v1/notification/in-app/filter", {
        params: { page, limit: itemsPerPage, sort, search: filters },
      });
    },
    fetchFilter({ id, ...params }) {
      return DataService.axios.get(
        `/api/v1/notification/in-app/filter/${id}`,
        params
      );
    },
    updateFilters({ id, ...params }) {
      return DataService.axios.put(
        `/api/v1/notification/in-app/filter/${id}`,
        params
      );
    },
    deleteFilters({ id, ...params }) {
      return DataService.axios.delete(
        `/api/v1/notification/in-app/filter/${id}`,
        params
      );
    },
  },
});
