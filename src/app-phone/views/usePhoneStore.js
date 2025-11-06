import { defineStore } from "pinia";
import DataService from "@/@common/services/DataService";

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
  },
});
