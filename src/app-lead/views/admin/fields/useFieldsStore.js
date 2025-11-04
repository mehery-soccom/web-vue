import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFieldsStore = defineStore("FieldsStore", {
    state: () => ({
        fields: [],
    }),
    getters: {},
    actions: {
        async fetchFields(params) {
            const response = await DataService.axios.get("/field/get", { params, toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async createField(params) {
            const response = await DataService.axios.post("/field/create", params, { toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async updateField({ id }, params) {
            const response = await DataService.axios.post(`/field/update/${id}`, params, { toast: false });
         
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },         

        async deleteField({ id }) {
            const response = await DataService.axios.delete(`/field/delete/${id}`, { toast: false });

            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async fetchCustomerFields(params) {
            const response = await DataService.axios.get("/field/customer/get", { params, toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
            
    }
})