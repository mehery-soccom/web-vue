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
        createForm(params) {
            return DataService.axios.post("/form/create", params);
        },
        updateForm({ id }, params) {
            return DataService.axios.post(`/form/update/${id}`, params);
        },
        deleteForm({ id }) {
            return DataService.axios.delete(`/form/delete/${id}`, {
                toast: false,
            });
        },
    }
});