import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useMetaStore = defineStore("MetaStore", {
  state: () => ({
    meta: null,
  }),
  getters: {},
  actions: {
    async fetchMeta(params) {
      try {
        const res = await DataService.axios.get("/api/v1/meta", { params });
        this.meta = res.data.data;
        return this.meta;
      } catch (error) {
        if (error.response?.status === 401) {
          let host = window.location.host;
          let h = host.split(".");
          h.shift();
          h = h.join(".");
          let u = `https://app.${h}/common/auth/logout?_=${Date.now()}&referer=https://${host}/pushapp/`;

          window.location.href = u;
        }
      }
    },
  },
});
