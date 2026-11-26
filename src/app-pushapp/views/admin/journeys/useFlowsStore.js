import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFlowsStore = defineStore("FlowsStore", {
  state: () => ({
    flows: [],
    cloneData: null,
  }),
  getters: {},
  actions: {
    createFlow(params) {
      return DataService.axios.post("/api/v1/journi", params);
    },
    fetchKinds() {
      return DataService.axios.get("/api/v1/journi/kinds");
    },
    fetchFlows(params) {
      let { page, itemsPerPage, sortBy = [], filters, paginate, kind } = params;

      let sort = sortBy
        .map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");

      return DataService.axios.get("/api/v1/journi", {
        params: {
          page,
          limit: itemsPerPage,
          sort: sort || "-createTime.stamp",
          search: filters,
          paginate,
          ...(kind ? { kind } : {}),
        },
      });
    },
    fetchFlow({ id, ...params }) {
      return DataService.axios.get(`/api/v1/journi/${id}`, params);
    },
    editFlow({ id, ...params }) {
      return DataService.axios.put(`/api/v1/journi/${id}`, params);
    },
    updateFlow({ id, ...params }) {
      return DataService.axios.put(`/api/v1/journi/${id}/status`, params);
    },
    deleteFlow({ id, ...params }) {
      return DataService.axios.delete(`/api/v1/journi/${id}`, params);
    },
    fetchFlowAnalytics({ id, from, to, fromStr, toStr, tz, format }) {
      const params = {};
      if (from != null) params.from = from;
      if (to != null) params.to = to;
      if (fromStr) params.fromStr = fromStr;
      if (toStr) params.toStr = toStr;
      if (tz) params.tz = tz;
      if (format) params.format = format;
      return DataService.axios.get(`/api/v1/journi/${id}/analytics`, { params });
    },
    setCloneData(data) {
      this.cloneData = data;
    },
    consumeCloneData() {
      const data = this.cloneData;
      this.cloneData = null;
      return data;
    },
  },
});
