import DataService from "@/@common/services/DataService";
import { defineStore } from "pinia";

export const useSequenceStore = defineStore("SequenceStore", {
  state: () => ({
    sequences: [],
    uniqueEvents: [],
  }),
  actions: {
    // Fetch all sequences
    async fetchSequences(params) {
      try {
        const res = await DataService.axios.get("/api/v1/sequence", { params });
        this.sequences = res.data.result || [];
        return res.data;
      } catch (error) {
        console.error("Error fetching sequences:", error);
        throw error;
      }
    },

    // Create a new sequence
    async createSequence(payload) {
      try {
        const res = await DataService.axios.post("/api/v1/sequence", payload);
        return res.data;
      } catch (error) {
        console.error("Error creating sequence:", error);
        throw error;
      }
    },

    // Delete a sequence
    async deleteSequence(sequenceId) {
      try {
        const res = await DataService.axios.delete(`/api/v1/sequence/${sequenceId}`);
        return res.data;
      } catch (error) {
        console.error("Error deleting sequence:", error);
        throw error;
      }
    },

    // Fetch list of unique events for the dropdown
    async fetchUniqueEvents() {
      try {
        const res = await DataService.axios.get("/api/v1/analytics/events/unique");
        this.uniqueEvents = res.data.data || [];
        return res.data;
      } catch (error) {
        console.error("Error fetching unique events:", error);
        throw error;
      }
    },

    // Fetch sequence comparison chart data
    async fetchSequenceComparison(params) {
      try {
        const res = await DataService.axios.get("/api/v1/analytics/sequence/compare-cohorts", { params });
        return res.data;
      } catch (error) {
        console.error("Error fetching sequence comparison:", error);
        throw error;
      }
    },

    // Fetch single sequence cohort chart data
    async fetchSequenceSingleCohort(params) {
      try {
        const res = await DataService.axios.get("/api/v1/analytics/sequence/cohort", { params });
        return res.data;
      } catch (error) {
        console.error("Error fetching single sequence cohort:", error);
        throw error;
      }
    },

    // Fetch sequence chart data without cohort
    async fetchSequenceNoCohort(params) {
      try {
        const res = await DataService.axios.get("/api/v1/analytics/sequence", { params });
        return res.data;
      } catch (error) {
        console.error("Error fetching sequence without cohort:", error);
        throw error;
      }
    },
  },
});