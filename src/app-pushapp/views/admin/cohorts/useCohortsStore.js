import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useCohortsStore = defineStore("CohortsStore", {
  state: () => ({
    cohorts: [],
  }),
  getters: {},
  actions: {
    createCohort(params) {
      return DataService.axios.post("/api/v1/cohort", params);
    },
    fetchCohorts(params) {
      let { page, itemsPerPage, sortBy = [], filters, paginate } = params; 
      
      let sort = sortBy
        .map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
        
      return DataService.axios.get("/api/v1/cohort", {
        params: {
          page,
          limit: itemsPerPage,
          sort: sort || "-created.stamp",
          search: filters,
          paginate,
        },
      });
    },
    fetchCohort({ id, ...params }) {
      return DataService.axios.get(`/api/v1/cohort/${id}`, params);
    },
    updateCohort({ id, ...params }) {
      return DataService.axios.put(`/api/v1/cohort/${id}`, params);
    },
    deleteCohort({ id, ...params }) {
      return DataService.axios.delete(`/api/v1/cohort/${id}`, params);
    },
  },
});
