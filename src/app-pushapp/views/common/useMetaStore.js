import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useMetaStore = defineStore("MetaStore", {
  state: () => ({
    meta: null,
  }),
  getters: {},
  actions: {
    async fetchMeta(params) {
      const res = await DataService.axios.get("/api/v1/meta", { params });
      this.meta = res.data.data;
      return this.meta;
    },
  },
});
