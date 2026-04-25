import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

export const useP2pCallStore = defineStore("P2pCallStore", {
  state: () => ({}),
  getters: {},
  actions: {
    getRoom(roomId, userId = null) {
      return DataService.axios.get(`/p2p/room/${roomId}`, { params: { userId } });
    },
    createRoom(roomId, userName, userId, previousUserId = null) {
      return DataService.axios.post("/p2p/room", { roomId, userName, userId, previousUserId });
    },
    updateRoom(roomId, updates) {
      return DataService.axios.post(`/p2p/room/${roomId}/update`, updates);
    },
    leaveRoom(roomId, userId) {
      return DataService.axios.post(`/p2p/room/${roomId}/leave`, { userId });
    },
  },
});