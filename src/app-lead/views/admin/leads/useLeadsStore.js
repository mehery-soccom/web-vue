import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useLeadsStore = defineStore("LeadsStore", {
    state: () => ({
        leads: [],
    }),
    getters: {},
    actions: {
        async fetchLeads(params) {
            const response = await DataService.axios.get("/profile/list", { params });
            return response.data;
        },

        async fetchLead(id) {
            const response = await DataService.axios.get(`/profile/get`, { params: { leadId: id } });
            return response.data.results;
        },

        async createLead(payload) {
            const response = await DataService.axios.post("/profile/create", payload);
            return response.data;
        },

        async updateLead({ id, data }) {
            const response = await DataService.axios.post(`/profile/update/${id}`, data);
            return response.data;
        },

        async deleteLead({ id }) {
            const response = await DataService.axios.delete(`/profile/delete/${id}`, {
                toast: false,
            });
            return response.data;
        },
    }
});

