import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFormsStore = defineStore("FormsStore", {
  state: () => ({
    forms: [],
    customerFields: [],
  }),
  actions: {
    async fetchForms(params) {
      const response = await DataService.axios.get("/api/feedback/form", { params, toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },

    async fetchForm(id) {
      const response = await DataService.axios.get(`/api/feedback/form/${id}`, { toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data.results?.[0] || response.data;
    },

    async fetchFormsForDropdown() {
      const params = { dropdown: true };
      const response = await DataService.axios.get('/api/feedback/form', { params, toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },

    // Fetch master fields for dropdowns (Updated path to follow master pattern)
    // async fetchFieldsForDropdown() {
    // //   const params = { dropdown: true };
    // //   const response = await DataService.axios.get('/api/feedback/master/field', { params, toast: false });
    // const response = await DataService.axios.get('/api/feedback/master/field', { toast: false });
    //   if (response.data.error) {
    //     throw { response: { data: response.data } };
    //   }
    //   this.customerFields = response.data.results;
    //   return this.customerFields;
    // },
    async fetchFieldsForDropdown(params) {
            const response = await DataService.axios.get("api/feedback/master/fields", { params, toast: false });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },

    async createForm(payload) {
      const response = await DataService.axios.post("/api/feedback/form", payload, { toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },

    async updateForm({ id }, payload) {
      const response = await DataService.axios.put(`/api/feedback/form/${id}`, payload, { toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },

    async deleteForm({ id }) {
      const response = await DataService.axios.delete(`/api/feedback/form/${id}`, { toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },
  }
});