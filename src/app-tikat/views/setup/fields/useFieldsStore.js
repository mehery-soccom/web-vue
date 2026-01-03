import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFieldsStore = defineStore("FieldsStore", {
    state: () => ({
        fields: [],
    }),
    getters: {},
    actions: {
        async fetchFields(params) {
            const response = await DataService.axios.get("api/feedback/master/fields", { params, toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async createField(params) {
            const response = await DataService.axios.post("api/feedback/master/fields", params, { toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async updateField({ id }, params) {
            const response = await DataService.axios.put(`api/feedback/master/fields/${id}`, params, { toast: false });
         
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },         

        async deleteField({ id }) {
            const response = await DataService.axios.delete(`api/feedback/master/fields/${id}`, { toast: false });

            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },            
    }
})