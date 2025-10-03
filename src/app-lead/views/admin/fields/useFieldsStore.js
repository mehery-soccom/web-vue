import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFieldsStore = defineStore("FieldsStore", {
    state: () => ({
        fields: [],
    }),
    getters: {},
    actions: {
        async fetchFields(params) {
            const response = await DataService.axios.get("/field/get", { params });
            return response.data;
        },
        createField(params) {
            return DataService.axios.post("/field/create", params);
        },
        updateField({ id }, params) {
            return DataService.axios.post(`/field/update/${id}`, params);
        },         
        deleteField({ id }) {
            return DataService.axios.delete(`/field/delete/${id}`, {
                toast: false,
            });
        },
        async fetchCustomerFields(params) {
            const response = await DataService.axios.get("/field/customer/get", { params });
            return response.data;
        },
            
    }
})