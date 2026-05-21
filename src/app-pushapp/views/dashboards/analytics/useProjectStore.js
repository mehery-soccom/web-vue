import axios from "@app-pushapp/@fake-db/axios";
import { defineStore } from "pinia";

export const useProjectStore = defineStore("ProjectStore", {
  actions: {
    // 👉 Fetch all project
    fetchProjects() {
      return axios.get("/dashboard/analytics/projects");
    },
    fetchChartDatas(params) {
      let url = `/api/dashboard/chart/device-activity`;
      return axios.post(url, params );
    },
    fetchDauMauDatas(params) {
      let url = `/api/dashboard/active-users?`;
      if (params.type) url += `type=${params.type}`;
      if (params.period) url += `&period=${params.period}`;
      return axios.get(url);
    },
  },
});
