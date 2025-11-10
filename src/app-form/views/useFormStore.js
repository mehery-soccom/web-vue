// stores/useFormStore.js
import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFormStore = defineStore("FormStore", {
	state: () => ({}),

	getters: {},

	actions: {
		
		async fetchFormData({ formId, submissionId, params }) {
			const url = `nexus/link/form/${formId}/${submissionId}`;

			try {
				const response = await DataService.axios.get(url, {
					params, 
					skipApiContext: true,
					toast: false,
				});

				if (response.data.error) {
					console.error("API Error:", response.data);
					throw { response: { data: response.data } };
				}

				return response.data;

			} catch (error) {
				throw error;
			}
		},
		async submitFormData({ formId, submissionId, params, payload }) {
			const url = `nexus/link/form/${formId}/${submissionId}/submit`;

			try {
				const response = await DataService.axios.post(url, payload, {
					params,
					skipApiContext: true,
					toast: false,
				});

				if (response.data.error) {
					throw { response: { data: response.data } };
				}

				return response.data;
			} catch (error) {
				throw error;
			}
		},
	},
});