import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useDocStore = defineStore("DocStore", {
    state: () => ({}),

    getters: {},

    actions: {
        async fetchDocs({ leadId, params }) {
            const response = await DataService.axios.get(`/documents/list/${leadId}`, { params, toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async createDoc({ payload, params }) {
            const response = await DataService.axios.post("/documents/create", payload, { params, toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async updateDoc({ id, payload }) {
            const response = await DataService.axios.post(`/documents/update/${id}`, payload, { toast: false });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async deleteDoc({ id, params }) {
            const response = await DataService.axios.delete(`/documents/delete/${id}`, {
                params,
                toast: false,
            });
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

        async uploadPofileDocument({ formData, existingUuid = null }) {
            let url = 'admin/api/upload/pofile/document?uploadType=insert';
            if (existingUuid) {
                url = `admin/api/upload/pofile/document?uploadType=update&uuId=${existingUuid}`;
            }

            const response = await DataService.axios.post(url, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                skipApiContext: true,
            });
            
            return response.data;
        },
    }
});

