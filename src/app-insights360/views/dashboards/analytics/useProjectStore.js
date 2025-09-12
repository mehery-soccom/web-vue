import axios from "axios";
import { defineStore } from "pinia";

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      window.location.href = `${window.location.origin}/nexus/insights360/auth/logout`;
    }
    return Promise.reject(error);
  }
);

export const useProjectStore = defineStore("ProjectStore", {
  actions: {
    // 👉 Fetch all project
    fetchProjects() {
      return axios.get("/dashboard/analytics/projects");
    },
    fetchChannels() {
      return axios.get(
        `${window.location.origin}/admin/admin/fetch-contact-type`
      );
    },
    fetchAgents() {
      return axios.get(
        `${window.location.origin}/admin/api/admins/agent?includeInActive=false`
      );
    },
    fetchTeams() {
      return axios.get(
        `${window.location.origin}/admin/api/admins/dept?includeInActive=false`
      );
    },
    fetchOpenChats(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/conversation-status/open?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchResolvedChats(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/conversation-status/resolved?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchSatScores(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/satisfaction-score?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchBotOpenChats(start, end, contact) {
      let url = `/api/v1/dashboard/conversation-status/open?dateRange1=${start}&dateRange2=${end}&agent=BOT`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      return axios.get(url);
    },
    fetchBotResolvedChats(start, end, contact) {
      let url = `/api/v1/dashboard/conversation-status/resolved?dateRange1=${start}&dateRange2=${end}&agent=BOT`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      return axios.get(url);
    },
    fetchActiveUsers(start, end, metric, contact) {
      let url = `/api/v1/dashboard/active-users/daily?dateRange1=${start}&dateRange2=${end}&metric=${metric}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      return axios.get(url);
    },
    fetchBotSatScores(start, end, contact) {
      let url = `/api/v1/dashboard/satisfaction-score?dateRange1=${start}&dateRange2=${end}&agent=BOT`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      return axios.get(url);
    },
    fetchLeadMsgs(start, end, agent, agentType) {
      let url = `/api/v1/dashboard/lead-messenger?dateRange1=${start}&dateRange2=${end}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchStartLags(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/start-lag?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchAvgResponses(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/avg-response-time?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchAvgDurations(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/avg-duration?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchTotalConvs(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/all-conversations?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchUniqueConvs(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/unique-conversations?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchCampaignDatas(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/campaign-data?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchCampaignPageDatas(start, end, contact, statuses) {
      let url = `/api/v1/dashboard/campaign-data?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (statuses && statuses.length > 0)
        statuses.forEach((e) => {
          url += `&status=${e}`;
        });
      return axios.get(url);
    },
    fetchTemplateDatas(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/template-data?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchMetaTemplateDatas(start, end, timezone) {
      let url = `/api/v1/dashboard/template-analytics/meta?start=${start}&end=${end}&timezone=${timezone}`;
      return axios.get(url);
    },
    fetchAgentDatas(start, end) {
      let url = `/api/v1/dashboard/agent-data?dateRange1=${start}&dateRange2=${end}`;
      return axios.get(url);
    },
    fetchChartDatas(start, end, contact, agent, agentType) {
      let url = `/api/v1/dashboard/charts?dateRange1=${start}&dateRange2=${end}`;
      if (contact && contact != "All Channels")
        url += `&contactType=${contact}`;
      if (agent && agentType && agent != "all_teams")
        url += `&${agentType}=${agent}`;
      return axios.get(url);
    },
    fetchOneCampaignData(id) {
      let url = `/api/v1/dashboard/campaign/cta/${id}`;
      return axios.get(url);
    },
    fetchOneCampaignOutboundData(id) {
      let url = `/api/v1/dashboard/campaign/outbound/${id}`;
      return axios.get(url);
    },
  },
});
