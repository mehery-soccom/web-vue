import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

const statsCache = new Map();

const statsCacheKey = (params = {}) =>
  JSON.stringify({
    dateRange1: params.dateRange1 ?? null,
    dateRange2: params.dateRange2 ?? null,
    timezone: params.timezone || null,
    cohortId: params.cohortId || null,
    filter: params.filter ?? null,
  });

export const useCustomDashboardStore = defineStore("CustomDashboardStore", {
  state: () => ({
    blocks: [],
  }),
  actions: {
    createDashboard(params) {
      return DataService.axios.post("/api/v1/analytics/management/dashboard", params);
    },
    fetchDashboards(params = {}) {
      const { page, itemsPerPage, sortBy = [], filters } = params;
      const sort = (sortBy || [])
        .map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
      return DataService.axios.get("/api/v1/analytics/management/dashboard", {
        params: {
          page,
          limit: itemsPerPage,
          ...(sort && { sort }),
          search: filters,
        },
      });
    },
    fetchDashboard({ id }) {
      return DataService.axios.get(`/api/v1/analytics/management/dashboard/${id}`);
    },
    updateDashboard({ id, ...params }) {
      return DataService.axios.put(`/api/v1/analytics/management/dashboard/${id}`, params);
    },
    deleteDashboard({ id }) {
      return DataService.axios.delete(`/api/v1/analytics/management/dashboard/${id}`);
    },
    reorderDashboards(orderedIds) {
      return DataService.axios.put("/api/v1/analytics/management/dashboard/reorder", { orderedIds });
    },
    getCachedEventFilterStats(params) {
      return statsCache.get(statsCacheKey(params)) ?? null;
    },
    rememberEventFilterStats(params, data) {
      statsCache.set(statsCacheKey(params), data);
    },
    fetchEventFilterStats(params, signal) {
      return DataService.axios.post("/api/v1/analytics/events/filter/stats", params, {
        signal,
      });
    },
    fetchEmailRecipients() {
      return DataService.axios.get("/api/v1/analytics/management/dashboard/email/recipients");
    },
    createEmailRecipients(users) {
      return DataService.axios.post("/api/v1/analytics/management/dashboard/email/recipients", {
        users,
      });
    },
    updateEmailRecipients(users) {
      return DataService.axios.put("/api/v1/analytics/management/dashboard/email/recipients", {
        users,
      });
    },
    deleteEmailRecipients() {
      return DataService.axios.delete("/api/v1/analytics/management/dashboard/email/recipients");
    },
  },
});
