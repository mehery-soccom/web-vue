import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useAppEngagementsStore = defineStore("AppEngagementsStore", {
  state: () => ({}),
  getters: {},
  actions: {
    // 👉 Fetch something
    fetchSomething({ id }) {
      return DataService.axios.get(`/api/something/${id}`);
    },
  },
});
