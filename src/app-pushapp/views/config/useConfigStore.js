import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useConfigStore = defineStore("ConfigStore", {
  state: () => ({}),
  getters: {},
  actions: {
    fetchConfigPrefs(params) {
      return DataService.axios.get("/api/v1/config/pref", { params });
    },
    updateConfigPref({ id, ...params }) {
      // return DataService.axios.put(`/api/v1/config/pref/${id}`, params);
      return DataService.axios.put(`/api/v1/config/pref?id=${id}`, params);
    },
  },
});
