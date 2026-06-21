import DataService from "@/@common/services/DataService";
import { defineStore } from "pinia";

export const useUserStore = defineStore("UserStore", {
  state: () => ({
    profiles: [],
    singleProfile: null,
  }),
  actions: {
    // Fetch paginated profiles using the FilterBuilder payload
    async fetchProfilesByFilter(payload, params) {
      try {
        const res = await DataService.axios.post("/api/v1/cohort/filter/profiles", payload, { params });
        return res.data;
      } catch (error) {
        console.error("Error fetching profiles by filter:", error);
        throw error;
      }
    },

    // Fetch a single profile by code directly
    async fetchProfileByCode(code, params) {
      try {
        const res = await DataService.axios.get("/api/v1/customer/profile", { 
          params: { ...params, code } 
        });
        return res.data;
      } catch (error) {
        console.error("Error fetching profile by code:", error);
        throw error;
      }
    },

    // Evaluate profile cohorts
    async evaluateProfileCohorts(payload) {
      try {
        const res = await DataService.axios.post("/api/v1/cohort/evaluate/profile?tnt=demo", payload);
        return res.data;
      } catch (error) {
        console.error("Error evaluating cohorts:", error);
        throw error;
      }
    },

    // Fetch user timeline
    async fetchUserTimeline(params) {
      try {
        const res = await DataService.axios.get("/api/v1/analytics/user/timeline", { params });
        return res.data;
      } catch (error) {
        console.error("Error fetching user timeline:", error);
        throw error;
      }
    }
  },
});