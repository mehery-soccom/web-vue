import { useP2pCallStore } from "../views/useP2PCallStore";

export const RealDB = {
  async getRoom(roomId, userId = null) {
    const P2pStore = useP2pCallStore();
    try {
      const res = await P2pStore.getRoom(roomId, userId);
      return res.data;
    } catch (e) {
      if (e.response?.status === 404) return null;
      return null;
    }
  },

  async createRoom(roomId, userName, userId, previousUserId = null) {
    const P2pStore = useP2pCallStore();
    try {
      const res = await P2pStore.createRoom(roomId, userName, userId, previousUserId);
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data || e.message;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  },

  async updateRoom(roomId, updates) {
    const P2pStore = useP2pCallStore();
    try {
      const res = await P2pStore.updateRoom(roomId, updates);
      return res.data;
    } catch (e) {
      throw e;
    }
  },

  async leaveRoom(roomId, userId) {
    const P2pStore = useP2pCallStore();
    try {
      await P2pStore.leaveRoom(roomId, userId);
    } catch (_) {}
  },
};