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
  },
});
