import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFormsStore = defineStore("FormsStore", {
    state: () => ({
        forms: [],
    }),
    getters: {},
    actions: {
        async fetchForms(params) {
            const response = await DataService.axios.get("/form/get", { params });
            return response.data;
        },
        async fetchForm(id) {
            const response = await DataService.axios.get(`/form/get`, { params: { formId: id } });
            return response.data.results[0];
        },
        async fetchFormsForDropdown() {
            const response = await DataService.axios.get('/form/get', { params: { dropdown: true } });
            return response.data;
        },
        async fetchFieldsForDropdown() {
            const response = await DataService.axios.get('/field/get', { params: { dropdown: true } });
            this.customerFields = response.data.results;
            return this.customerFields;
        },
        async createForm(payload) {
            return await DataService.axios.post("/form/create", payload);
        },
        async updateForm({ id, data }) {
            return await DataService.axios.post(`/form/update/${id}`, data);
        },
        async deleteForm({ id }) {
            return await DataService.axios.delete(`/form/delete/${id}`, {
                toast: false,
            });
        },
    }
});