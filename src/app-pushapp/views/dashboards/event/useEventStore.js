import DataService from "@/@common/services/DataService";
import { defineStore } from "pinia";

export const useEventStore = defineStore("EventStore", {
  state: () => ({
    uniqueEvents: [],
    eventStats: {
      total_events: 0,
      unique_users: 0,
    },
  }),
  actions: {
    // Fetch list of unique event names
    async fetchUniqueEvents() {
      try {
        const res = await DataService.axios.get("/api/v1/analytics/events/unique");
        this.uniqueEvents = res.data.data || [];
        return res.data;
      } catch (error) {
        console.error("Error fetching unique events:", error);
      }
    },

    // Fetch stats for a specific event and date range
    async fetchEventStats(params) {
      try {
        const res = await DataService.axios.get("/api/v1/analytics/events/stats", { params });
        this.eventStats = {
          total_events: res.data.total_events,
          unique_users: res.data.unique_users,
        };
        return res.data;
      } catch (error) {
        console.error("Error fetching event stats:", error);
      }
    },

    async fetchTimeSlotStats(params) {
      return DataService.axios.get("/api/v1/analytics/events/timeSlot", { params });
    },

    // Events over time
    async fetchEventOverTime(params) {
      return DataService.axios.get("/api/v1/analytics/events/event", { params });
    },

    //Users over time
    async fetchUserOverTime(params) {
      return DataService.axios.get("/api/v1/analytics/events/users", { params });
    },
  },
});