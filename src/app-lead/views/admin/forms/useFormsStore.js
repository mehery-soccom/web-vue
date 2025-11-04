import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFormsStore = defineStore("FormsStore", {
    state: () => ({
        forms: [],
    }),
    getters: {},
    actions: {
        async fetchForms(params) {
            const response = await DataService.axios.get("/form/get", { params, toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
        async fetchForm(id) {
            const response = await DataService.axios.get(`/form/get`, { params: { formId: id }, toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data.results[0];
        },
        async fetchFormsForDropdown() {
            const response = await DataService.axios.get('/form/get', { params: { dropdown: true }, toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
        async fetchFieldsForDropdown() {
            const response = await DataService.axios.get('/field/get', { params: { dropdown: true }, toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            this.customerFields = response.data.results;
            return this.customerFields;
        },
        async createForm(payload) {
            const response = await DataService.axios.post("/form/create", payload, { toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
        async updateForm({ id, data }) {
            const response = await DataService.axios.post(`/form/update/${id}`, data, { toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
        async deleteForm({ id }) {
            const response = await DataService.axios.delete(`/form/delete/${id}`, {
                toast: false,
            });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
    }
});