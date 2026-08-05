import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useLibraryStore = defineStore("LibraryStore", {
  state: () => ({
    pageList: [],
    pageListLoading: false,
    placeholderList: [],
    placeholderListLoading: false,
  }),
  getters: {},
  actions: {
    create(params) {
      return DataService.axios.post("/api/v1/catalog", params);
    },
    readAll(params) {
      let { page, itemsPerPage, sortBy, filters } = params || {};
      let sort = sortBy
        ?.map((s) => `${s.order === "asc" ? "-" : ""}${s.key}`)
        .join(",");
      return DataService.axios.get("/api/v1/catalog", {
        params: {
          page,
          limit: itemsPerPage,
          sort: sort || "-created.stamp",
          search: filters,
        },
      });
    },
    read({ id, ...params }) {
      return DataService.axios.get(`/api/v1/catalog/${id}`, { params });
    },
    update({ id, ...params }) {
      return DataService.axios.patch(`/api/v1/catalog/${id}`, params);
    },
    delete({ id, ...params }) {
      return DataService.axios.delete(`/api/v1/catalog/${id}`, params);
    },
    publish({ id, ...params }) {
      return DataService.axios.post(`/api/v1/catalog/${id}/publish`, params);
    },
    readOptions({ id, ...params }) {
      return DataService.axios.get(`/api/v1/catalog/${id}/options`, { params });
    },
  },
});
