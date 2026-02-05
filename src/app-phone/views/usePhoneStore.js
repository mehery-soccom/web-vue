import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";
import axios from "axios";

export const usePhoneStore = defineStore("PhoneStore", {
  state: () => ({
    
  }),
  getters: {},
  actions: {
    sendAnswerToMeta(params) {
      return DataService.axios.post("/whatsapp/calling/accept", params);
    },
    rejectSendToMeta(params) {
      return DataService.axios.post("/whatsapp/calling/reject", params);
    },
    terminateCallToMeta(params) {
      return DataService.axios.post("/whatsapp/calling/terminate", params);
    },
    sendOfferToMeta(params) {
      return DataService.axios.post("/whatsapp/calling/initiate", params);
    },
    askPermissionToMeta(params) {
      return DataService.axios.post("/whatsapp/calling/user-permission", params);
    },
    getChannels(params) {
      return DataService.axios.get("/agent/pub/options/channels", { skipApiContext: true, params });
    },
    getCallSuggestion(params) {
      return DataService.axios.get("/whatsapp/calling/contacts", { params });
    },
  },
});
