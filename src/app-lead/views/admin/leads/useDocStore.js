import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useDocStore = defineStore("DocStore", {
    state: () => ({}),

    getters: {},

    actions: {
        async fetchDocs({ leadId, params }) {
            const response = await DataService.axios.get(`/documents/list/${leadId}`, { params });
            return response.data;
        },

        async createDoc({ payload, params }) {
            const response = await DataService.axios.post("/documents/create", payload, { params });
            return response.data;
        },

        async updateDoc({ id, payload }) {
            const response = await DataService.axios.post(`/documents/update/${id}`, payload);
            return response.data;
        },

        async deleteDoc({ id, params }) {
            const response = await DataService.axios.delete(`/documents/delete/${id}`, {
                params,
                toast: false,
            });
            return response.data;
        },
    }
});

