import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

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
          sort: sort || "-createdAt",
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
  },
});
