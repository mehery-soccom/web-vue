import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useStatusStore = defineStore("StatusStore", {
  state: () => ({
    statuses: [],
  }),
  actions: {
    async fetchStatuses(params) {
      const response = await DataService.axios.get("/api/feedback/master/status", { params, toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },

    async createStatus(params) {
      const response = await DataService.axios.post("/api/feedback/master/status", params, { toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },

    async updateStatus({ id }, params) {
      const response = await DataService.axios.put(`/api/feedback/master/status/${id}`, params, { toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },

    async deleteStatus({ id }) {
      const response = await DataService.axios.delete(`/api/feedback/master/status/${id}`, { toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },
  }
})