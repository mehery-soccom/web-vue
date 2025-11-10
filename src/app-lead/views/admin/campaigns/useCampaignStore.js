import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useCampaignStore = defineStore("CampaignStore", {
    state: () => ({
        campaigns: [],
    }),
    getters: {},
    actions: {
        async fetchCampaigns(params) {
            const response = await DataService.axios.get("/campaign/get", { params, toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async fetchCampaign(id) {
            const response = await DataService.axios.get(`/campaign/get/${id}`, { toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
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

        async deactivateCampaign(id) {
            const response = await DataService.axios.post(`/campaign/deactivate/${id}`, {}, { toast: false });

            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
    }
})