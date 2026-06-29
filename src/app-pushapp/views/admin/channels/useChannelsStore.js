import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useChannelsStore = defineStore("ChannelsStore", {
  state: () => ({
    channels: [],
  }),
  getters: {
    channelsCount: (state) => state.channels.length,
  },
  actions: {
    // 👉 Fetch all Channels
    async fetchChannels() {
      let apiRes = await DataService.axios.get("/api/channels");
      this.channels = apiRes.data.channels;
      let res = {
        results: apiRes.data.channels,
        data: {
          total: apiRes.data.total_channels,
          page: 1,
        },
      };
      return res;
    },

    // 👉 Fetch single Channel
    fetchChannel({ id }) {
      return DataService.axios.get(`/api/channel/${id}`);
    },

    // 👉 Create Channel
    createChannel(params) {
      return DataService.axios.post("/api/channel", params, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },

    // 👉 Update Channel
    updateChannel(id, params) {
      return DataService.axios.put(`/api/channel/${id}`, params, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },

    // 👉 Update Platform
    updatePlatform({ channel_id, platform_id }, params) {
      return DataService.axios.put(
        `/api/channel/${channel_id}/platform/${platform_id}/deactivate`,
        params
      );
    },

    // 👉 Delete Channel
    deleteChannel({ id }) {
      return DataService.axios.delete(`/api/channel/${id}?user_id=user123`, {
        toast: false,
      });
    },

    getAppInfo(id, params) {
      return DataService.axios.get(`/api/v1/channel/${id}`, params );
    },

    updateAppInfo(id, params) {
      return DataService.axios.get(`/api/v1/channel/${id}/credentials`, params );
    },
  },
});
