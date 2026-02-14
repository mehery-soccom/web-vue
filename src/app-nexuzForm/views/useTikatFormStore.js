import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useTikatFormStore = defineStore("TikatFormStore", {
  state: () => ({
    isLoading: false,
  }),
  actions: {
    async fetchFormStructure({ formId, params }) {
      const response = await DataService.axios.get(`/tikat/feedback/${formId}`, { 
        params, 
        toast: false 
      });
      
      if (response.data.error) {
        throw response.data;
      }
      return response.data;
    },

    async submitFeedback({ formId, payload, params }) {
      const response = await DataService.axios.post(`/tikat/feedback/${formId}`, payload, { 
        params 
      });
      
      if (response.data.error) {
        throw response.data;
      }
      return response.data;
    }
  },
});