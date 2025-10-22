import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useStagesStore = defineStore("StagesStore", {
    state: () => ({
        stages: [],
    }),

    getters: {},

    actions: {
        async fetchStages(params) {
            const response = await DataService.axios.get("/stage/list", { params });
            return response.data;
        },

        async createStage({ payload, params }) {
            const response = await DataService.axios.post("/stage/create", payload, { params });
            return response.data;
        },

        async updateStage({ id, data, params }) {
            const response = await DataService.axios.post(`/stage/edit/${id}`, data, { params });
            return response.data;
        },

        async deleteStage({ id, params }) {
            const response = await DataService.axios.delete(`/stage/delete/${id}`, {
                params,
                toast: false,
            });
            return response.data;
        },
    }
});