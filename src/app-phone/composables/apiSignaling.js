import axios from "axios";

// Backend runs on 8090 now
const API_URL = "http://localhost:8090/nexus/phone/p2p/room";
// const API_URL = 'http://localhost:3000/api/room';
export const RealDB = {
  async getRoom(roomId, userId = null) {
    try {
      const res = await axios.get(`${API_URL}/${roomId}`, {
        params: { userId },
        withCredentials: true,
      });
      return res.data;
    } catch (e) {
      if (e.response?.status === 404) return null;
      return null;
    }
  },

  async createRoom(roomId, userName, userId, previousUserId = null) {
    try {
      const res = await axios.post(
        API_URL,
        { roomId, userName, userId, previousUserId },
        { withCredentials: true },
      );
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data || e.message;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  },

  async updateRoom(roomId, updates) {
    try {
      const res = await axios.post(`${API_URL}/${roomId}/update`, updates, {
        withCredentials: true,
      });
      return res.data;
    } catch (e) {
      throw e;
    }
  },

  async leaveRoom(roomId, userId) {
    try {
      await axios.post(
        `${API_URL}/${roomId}/leave`,
        { userId },
        { withCredentials: true },
      );
    } catch (_) {}
  },
};
