import DataService from "@/@common/services/DataService";
import { defineStore } from "pinia";

export const useProjectStore = defineStore("ProjectStore", {
  actions: {
    fetchProjects() {
      return DataService.axios.get("/dashboard/analytics/projects");
    },
    
    fetchChartDatas(params) {
      return DataService.axios.post("/api/dashboard/chart/device-activity", params);
    },
    
    fetchDauMauDatas(params) {
      return DataService.axios.get("/api/dashboard/active-users", { params });
    },
  },
});