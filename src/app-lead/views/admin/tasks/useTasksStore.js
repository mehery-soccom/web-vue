import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useTaskStore = defineStore("TaskStore", {
    state: () => ({
        tasks: [],
    }),
    getters: {},
    actions: {
        async fetchTasks(params) {
            // URL derived from: http://localhost:8090/scriptus/lead/profile/followups/get
            // Assuming DataService handles the base domain/prefix
            const response = await DataService.axios.get("/profile/followups/get", { 
                params, 
                toast: false 
            });
            
            if (response.data.error) {
                throw { response: { data: response.data } };
            }
            return response.data;
        },
    }
});