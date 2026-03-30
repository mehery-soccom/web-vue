import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useAnalyticsStore = defineStore("AnalyticsStore", {
  state: () => ({
    statusSummary: [],
    segmentationSummary: [],
    isLoading: false,
  }),

  getters: {
    overallTotalResponses: (state) => {
      return state.statusSummary.reduce((acc, curr) => acc + (curr.total || 0), 0);
    }
  },

  actions: {
    async fetchStatusSummary(flavour = "feedback") {
      this.isLoading = true;
      try {
        const response = await DataService.axios.get(`api/${flavour}/analytics/summary/status`, { 
          toast: false 
        });

        if (response.data.error) {
          throw { response: { data: response.data } };
        }

        this.statusSummary = response.data.data || [];
        return this.statusSummary;
      } catch (error) {
        console.error("Error fetching status summary:", error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSegmentationSummary(flavour = "feedback", params) {
      this.isLoading = true;
      try {
        const response = await DataService.axios.get(`api/${flavour}/analytics/summary/segmentation`, { 
          params, 
          toast: false 
        });

        if (response.data.error) {
          throw { response: { data: response.data } };
        }

        this.segmentationSummary = response.data.data || [];
        return this.segmentationSummary;
      } catch (error) {
        console.error("Error fetching segmentation summary:", error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    clearAnalytics() {
      this.statusSummary = [];
      this.segmentationSummary = [];
    }
  }
});