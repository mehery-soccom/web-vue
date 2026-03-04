import axios from "axios";

// Backend runs on 8090 now
const API_URL = "http://localhost:8090/nexus/phone/p2p/room";
// const API_URL = 'http://localhost:3000/api/room';
export const RealDB = {
  async getRoom(roomId) {
    try {
      const res = await axios.get(`${API_URL}/${roomId}`, {
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

  async addCandidate(roomId, candidate, type, sessionId) {
    try {
      await axios.post(
        `${API_URL}/${roomId}/candidate`,
        { candidate, type, sessionId },
        { withCredentials: true },
      );
    } catch (_) {}
  },

  // Keepalive. Returns { ok, sessionId, status }
  async heartbeat(roomId, userId) {
    try {
      const res = await axios.post(
        `${API_URL}/${roomId}/heartbeat`,
        { userId },
        { withCredentials: true },
      );
      return res.data;
    } catch (_) {
      return null;
    }
  },

  async createNewSession(roomId, userId, userName) {
    try {
      const res = await axios.post(
        `${API_URL}/${roomId}/new-session`,
        { userId, userName },
        { withCredentials: true },
      );
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
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
