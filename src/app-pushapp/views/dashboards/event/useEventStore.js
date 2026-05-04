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

    // Fetch Time Slot (Time of Day) stats
    async fetchTimeSlotStats(params) {
      try {
        return await DataService.axios.get("/api/v1/analytics/events/timeSlot", { params });
      } catch (error) {
        console.error("Error fetching time slot stats:", error);
      }
    },

    // Events over time
    async fetchEventOverTime(params) {
      try {
        return await DataService.axios.get("/api/v1/analytics/events/event", { params });
      } catch (error) {
        console.error("Error fetching event over time:", error);
      }
    },

    // Users over time
    async fetchUserOverTime(params) {
      try {
        return await DataService.axios.get("/api/v1/analytics/events/users", { params });
      } catch (error) {
        console.error("Error fetching users over time:", error);
      }
    },

    // Session Time stats
    async fetchSessionTimeStats(params) {
      try {
        return await DataService.axios.get("/api/v1/analytics/events/sessionTime", { params });
      } catch (error) {
        console.error("Error fetching session time stats:", error);
      }
    },

    // Session Page stats
    async fetchSessionPageStats(params) {
      try {
        return await DataService.axios.get("/api/v1/analytics/events/sessionPages", { params });
      } catch (error) {
        console.error("Error fetching session page stats:", error);
      }
    },

    // Device specific stats (platform, model, etc.)
    async fetchDeviceStats(property, params) {
      try {
        return await DataService.axios.get(`/api/v1/analytics/events/device/${property}`, { params });
      } catch (error) {
        console.error(`Error fetching device stats for ${property}:`, error);
      }
    },
  },
});