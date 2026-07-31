import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useApiStore = defineStore("ApiStore", {
  state: () => ({
    pageList: [],
  }),
  getters: {},
  actions: {
    create(params) {
      return DataService.axios.post("/api/v1/client-app", params);
    },
    readAll(params) {
      let { page, itemsPerPage, sortBy, filters } = params || {};
      let sort = sortBy
        ?.map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
      return DataService.axios.get("/api/v1/client-app", {
        params: {
          page,
          limit: itemsPerPage,
          sort: sort || "-created.stamp",
          search: filters,
        },
      });
    },
    read({ id, ...params }) {
      return DataService.axios.get(`/api/v1/client-app/${id}`, { params });
    },
    update({ id, ...params }) {
      return DataService.axios.patch(`/api/v1/client-app/${id}`, params);
    },
    delete({ id, ...params }) {
      return DataService.axios.delete(`/api/v1/client-app/${id}`, params);
    },
    getApiCreds({ id, ...params }) {
      return DataService.axios.get(`/api/v1/client-app/${id}/credentials`, { params });
    },
  },
});
