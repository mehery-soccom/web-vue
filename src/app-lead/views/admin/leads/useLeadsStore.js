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
        async createLeadFollowup({ leadId, payload }) {
            const response = await DataService.axios.post(`/profile/followups/${leadId}`, payload, { toast: false })
            if (response.data.error) {
                throw { response: { data: response.data } }
            }
            return response.data
        },

        async updateLeadFollowup({ leadId, followupId, payload }) {
            const response = await DataService.axios.post(`profile/followups/${leadId}/${followupId}/update`, payload, { toast: false })
            if (response.data.error) {
                throw { response: { data: response.data } }
            }
            return response.data
        },

        async cancelLeadFollowup({ leadId, followupId, payload }) {
            const response = await DataService.axios.post(`profile/followups/${leadId}/${followupId}/cancel`, payload, { toast: false })
            if (response.data.error) {
                throw { response: { data: response.data } }
            }
            return response.data
        },

        async fetchAgents() {
            const response = await DataService.axios.get("admin/api/admins/agent", {
                skipApiContext: true,
                toast: false,
            });
            return response.data;
        },

        async assignLead(payload) {
            const response = await DataService.axios.post("/profile/bulk-assign", payload, { toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

    }
});

