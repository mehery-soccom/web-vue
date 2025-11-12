import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useCampaignStore = defineStore("CampaignStore", {
    state: () => ({
        campaigns: [],
    }),
    getters: {
    /**
     * Finds a campaign by its ID from the state.
     * @param {object} state - The store's state.
     * @returns {Function} A function that takes an ID and returns the campaign object or undefined.
     */
    getCampaignById: (state) => (id) => {
      return state.campaigns.find(c => c._id === id);
    },
  },
    actions: {
        async fetchCampaigns(params) {
            const response = await DataService.axios.get("/campaign/get", { params, toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }

            this.campaigns = response.data.results || [];

            return response.data;
        },

        async createCampaign(payload) {
            const response = await DataService.axios.post("/campaign/create", payload, { toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async updateCampaign({ id, payload }) {
            const response = await DataService.axios.post(`/campaign/update/${id}`, payload, { toast: false });
         
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },         

        async deactivateCampaign(id, byUser) {
          const payload = { byUser } 
          const response = await DataService.axios.post(`/campaign/deactivate/${id}`, payload, { toast: false });

          if (response.data.error) {
              throw { response: { data: response.data } };
          }
          return response.data;
        },
    }
})