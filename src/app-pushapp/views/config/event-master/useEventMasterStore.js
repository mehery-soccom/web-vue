import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";
import { resetEventLabels } from "./eventMaster";

const BASE = "/api/v1/event-definition";
const enc = encodeURIComponent; // event names and keys can contain spaces and dots

export const useEventMasterStore = defineStore("EventMasterStore", {
  state: () => ({}),
  actions: {
    /** All events in one call (no `page`); search, paging and the hidden filter run in the browser. */
    async listAll() {
      const res = await DataService.axios.get(BASE);
      return res.data.data || [];
    },
    async get(eventName) {
      const res = await DataService.axios.get(`${BASE}/${enc(eventName)}`);
      return res.data.data;
    },
    /** body: { displayLabel?, description?, hidden? } */
    async update(eventName, body) {
      const res = await DataService.axios.put(`${BASE}/${enc(eventName)}`, body);
      resetEventLabels();
      return res.data.data;
    },
    /** body: { label?, dataType?, required? } — edit-only, key must already exist */
    async updateProperty(eventName, key, body) {
      const res = await DataService.axios.put(`${BASE}/${enc(eventName)}/properties/${enc(key)}`, body);
      return res.data.data;
    },
    /** Last 7 days of activity, same endpoint and params as Event Analytics' Snap view. */
    async last7Days(eventName) {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const timezone = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asia/Kolkata";
      const res = await DataService.axios.get("/api/v1/analytics/events/stats", {
        params: { event_name: eventName, dateRange1: start.getTime(), dateRange2: end.getTime(), timezone },
      });
      return { events: res.data.total_events || 0, users: res.data.unique_users || 0 };
    },
  },
});
