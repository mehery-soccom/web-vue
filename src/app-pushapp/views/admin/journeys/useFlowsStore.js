import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFlowsStore = defineStore("FlowsStore", {
  state: () => ({
    flows: [],
  }),
  getters: {},
  actions: {
    createFlow(params) {
      return DataService.axios.post("/api/v1/journi", params);
    },
    fetchFlows(params) {
      let { page, itemsPerPage, sortBy = [], filters, paginate } = params; 
      
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
        },
      });
    },
    fetchFlow({ id, ...params }) {
      return DataService.axios.get(`/api/v1/journi/${id}`, params);
    },
    updateFlow({ id, ...params }) {
      return DataService.axios.put(`/api/v1/journi/${id}/status`, params);
    },
    deleteFlow({ id, ...params }) {
      return DataService.axios.delete(`/api/v1/journi/${id}`, params);
    },
  },
});
