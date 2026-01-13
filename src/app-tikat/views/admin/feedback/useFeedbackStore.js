import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useFeedbackStore = defineStore("FeedbackStore", {
  state: () => ({
    feedbacks: [],
  }),
  actions: {
    async fetchFeedbacks(params) {
      const response = await DataService.axios.get("/api/feedback", { params, toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async fetchFeedbacksDownload() {
      const params = { download: true };
      const response = await DataService.axios.get('/api/feedback', { params, toast: false });
      if (response.data.error) {
        throw { response: { data: response.data } };
      }
      return response.data;
    },

    async fetchFeedback(id) {
      const response = await DataService.axios.get(`/api/feedback/${id}`, { params: { includeFollowups: true }, toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async createFeedback(payload) {
      const response = await DataService.axios.post("/api/feedback", payload, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async updateFeedback({ id, data }) {
      const response = await DataService.axios.put(`/api/feedback/${id}`, data, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async deleteFeedback(id) {
      const response = await DataService.axios.delete(`/api/feedback/${id}`, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async assignFeedback(payload) {
      const response = await DataService.axios.post("/api/feedback/bulk-assign", payload, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async fetchAgents() {
      const response = await DataService.axios.get("nexuz/tikat/agents", {
        skipApiContext: true,
        toast: false,
      });
      return response.data;
    },

    async addNoteOrDoc({ id, payload }) {
      const response = await DataService.axios.put(`/api/feedback/${id}`, payload, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async updateSubResource({ feedbackId, type, resourceId, payload }) {
      const response = await DataService.axios.put(`/api/feedback/${feedbackId}/${type}/${resourceId}`, payload, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async deleteSubResource({ feedbackId, type, resourceId }) {
      const response = await DataService.axios.delete(`/api/feedback/${feedbackId}/${type}/${resourceId}`, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async uploadModuleDocument({ formData }) {
      const url = '/pub/scriptus/module/upload';

      const response = await DataService.axios.post(url, formData, {
          headers: {
              "Content-Type": "multipart/form-data",
          },
          skipApiContext: true,
      });
            
      return response.data;
    }, 
    
    async createFollowup({ feedbackId, payload }) {
      const response = await DataService.axios.post(`/api/feedback/${feedbackId}/followup`, payload, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async updateFollowup({ feedbackId, followupId, payload }) {
      const response = await DataService.axios.put(`/api/feedback/${feedbackId}/followup/${followupId}`, payload, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },

    async deleteFollowup({ feedbackId, followupId }) {
      const response = await DataService.axios.delete(`/api/feedback/${feedbackId}/followup/${followupId}`, { toast: false });
      if (response.data.error) throw { response: { data: response.data } };
      return response.data;
    },
    
  }
});