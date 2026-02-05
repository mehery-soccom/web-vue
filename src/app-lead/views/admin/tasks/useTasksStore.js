import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useTaskStore = defineStore("TaskStore", {
    state: () => ({
        tasks: [],
    }),
    getters: {},
    actions: {
        async fetchTasks(params) {
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