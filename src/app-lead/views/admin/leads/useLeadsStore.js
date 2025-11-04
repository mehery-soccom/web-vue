import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useLeadsStore = defineStore("LeadsStore", {
    state: () => ({
        leads: [],
    }),
    getters: {},
    actions: {
        async fetchLeads(params) {
            const response = await DataService.axios.get("/profile/list", { params, toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async fetchLead(id) {
            const response = await DataService.axios.get(`/profile/get`, { params: { leadId: id }, toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data.results;
        },

        async createLead(payload) {
            const response = await DataService.axios.post("/profile/create", payload, { toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async updateLead({ id, data }) {
            const response = await DataService.axios.post(`/profile/update/${id}`, data, { toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async deleteLead({ id }) {
            const response = await DataService.axios.delete(`/profile/delete/${id}`, {
                toast: false,
            });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        // async createFollowup(payload) {
        //     const response = await DataService.axios.post("/nexus/calendar/api/v1/followup/create", payload);
        //     return response.data;
        // },
        async createFollowup(payload) {
            const response = await DataService.axios.post("/nexus/calendar/api/v1/followup/create", payload, { toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
        async linkFollowupToLead({ leadId, payload }) {
            const response = await DataService.axios.post(`/profile/followups/${leadId}`, payload, { toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
    }
});

