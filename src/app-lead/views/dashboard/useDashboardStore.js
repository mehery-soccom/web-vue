import DataService from "@/@common/services/DataService";
import { defineStore } from "pinia";

export const useDashboardStore = defineStore("DashboardStore", {
  state: () => ({
    stageSummary: {}, 
    sourceSummary: [],
    countSummary: {},
    isLoading: false,
  }),
  actions: {
    async fetchStageSummary(params) {
      this.isLoading = true;
      try {
        const response = await DataService.axios.get("/analytics/summary/stage", { params, toast: false });
        this.stageSummary = response.data.results || {};
        return response.data;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSourceSummary(params) {
      this.isLoading = true;
      try {
        const response = await DataService.axios.get("/analytics/summary/source", { params, toast: false });
        this.sourceSummary = response.data.results || [];
        return response.data;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchCountSummary(params) {
      this.isLoading = true;
      try {
        const response = await DataService.axios.get("/analytics/summary/count", { params, toast: false });
        this.countSummary = response.data.results || {};
        return response.data;
      } finally {
        this.isLoading = false;
      }
    },
  },
});