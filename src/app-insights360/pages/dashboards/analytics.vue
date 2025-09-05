<script setup>
import CardStatisticsTransactions from "@app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue";
import ChartJsLineChart from "@app-insights360/views/dashboards/analytics/ChartJsLineChart.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref } from "vue";
import { useTheme } from "vuetify";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";

const { customPlugin } = useDatePickerFilters();
const vuetifyTheme = useTheme();
const currentTheme = vuetifyTheme.current.value.colors;
const projectStore = useProjectStore();

const oldDates = ref([]);
const today = new Date();
var oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
const formattedStart = oneWeekAgo
  .toLocaleDateString("en-GB")
  .split("/")
  .join("-");
const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-");
const dates = `${formattedStart} to ${formattedEnd}`;
var dateRange = ref(dates);

// const items = [{ title: 'Option 1', value: 'Option 1' }, { title: 'Option 2', value: 'Option 2' }, { title: 'Option 3', value: 'Option 3' }]
const channelItems = ref();
const selectedChannelItem = ref("All Channels");
const agentTeamItems = ref();
const selectedAgentTeamItem = ref({
  name: "All Agents",
  code: "all_teams",
  id: "all_teams",
});
const listAgents = ref();
const listTeams = ref();

var statsAgent = ref([
  {
    title: "Agent - Open",
    color: "primary",
    icon: "tabler-message-2",
    stats: "0",
  },
  {
    title: "Agent - Resolved",
    color: "success",
    icon: "tabler-circle-dashed-check",
    stats: "0",
  },
  {
    title: "Agent - Expired",
    color: "error",
    icon: "tabler-square-x",
    stats: "0",
  },
  {
    title: "Agent - Satisfaction Score",
    color: "warning",
    icon: "tabler-message-chatbot",
    stats: "0",
  },
]);
var statsBot = ref([
  {
    title: "Bot - Open",
    color: "primary",
    icon: "tabler-message-2",
    stats: "0",
  },
  {
    title: "Bot - Resolved",
    color: "success",
    icon: "tabler-circle-dashed-check",
    stats: "0",
  },
  {
    title: "Bot - Closed",
    color: "error",
    icon: "tabler-square-x",
    stats: "0",
  },
  {
    title: "Bot - Satisfaction Score",
    color: "warning",
    icon: "tabler-mood-puzzled",
    stats: "0",
  },
]);

var statsLead = ref([
  {
    title: "Lead Messenger",
    color: "primary",
    icon: "tabler-device-mobile-message",
    stats: "0",
  },
  {
    title: "Average Start Lag ",
    color: "success",
    icon: "tabler-stopwatch",
    stats: "0",
  },
  {
    title: "Average Response Lag ",
    color: "error",
    icon: "tabler-device-watch",
    stats: "0",
  },
  {
    title: "Average Conversation Duration",
    color: "warning",
    icon: "tabler-hourglass-empty",
    stats: "0",
  },
]);

const statsCamp = ref([
  {
    title: "Sent",
    stats: "0",
    icon: "tabler-send",
    color: "primary",
  },
  {
    title: "Delivered",
    stats: "0",
    icon: "tabler-mailbox",
    color: "info",
  },
  {
    title: "Read",
    stats: "0",
    icon: "tabler-book",
    color: "error",
  },
  {
    title: "Replied",
    stats: "0",
    icon: "tabler-message-reply",
    color: "success",
  },
]);
const convoStats = ref([
  {
    title: "Total Conversations",
    color: "warning",
    stats: "0",
    icon: "tabler-list-details",
  },
  {
    title: "Unique Conversations",
    color: "success",
    stats: "0",
    icon: "tabler-list-numbers",
  },
  {
    title: "Daily Active Users",
    color: "primary",
    stats: "0",
    icon: "tabler-users"
  }
]);

const chartJsCustomColors = {
  yellow: "#ffe802",
  primary: "#836af9",
  areaChartBlue: "#2c9aff",
  barChartYellow: "#ffcf5c",
  polarChartGrey: "#4f5d70",
  polarChartInfo: "#299aff",
  lineChartYellow: "#d4e157",
  polarChartGreen: "#28dac6",
  lineChartPrimary: "#9e69fd",
  lineChartWarning: "#ff9800",
  horizontalBarInfo: "#26c6da",
  polarChartWarning: "#ff8131",
  scatterChartGreen: "#28c76f",
  warningShade: "#ffbd1f",
  areaChartBlueLight: "#84d0ff",
  areaChartGreyLight: "#edf1f4",
  scatterChartWarning: "#ff9f43",
};

// const chartData = ref({});
const chartData = ref({
  labels: [0, 10, 20],
  datasets: [
    {
      fill: false,
      tension: 0.5,
      pointRadius: 1,
      label: "Agent",
      pointHoverRadius: 5,
      pointStyle: "circle",
      borderColor: chartJsCustomColors.primary,
      backgroundColor: chartJsCustomColors.primary,
      pointHoverBorderWidth: 5,
      pointHoverBorderColor: chartJsCustomColors.white,
      pointBorderColor: "transparent",
      pointHoverBackgroundColor: chartJsCustomColors.primary,
      data: [80, 150, 180],
    },
  ],
});
const chartOptions = ref({});

const statisticsVertical = {
  title: "Revenue Generatedii",
  color: "success",
  icon: "tabler-credit-card",
  stats: "97.5k",
  height: 97,
  series: [
    {
      data: [300, 350, 330, 380, 340, 400, 380],
    },
  ],
  chartOptions: {
    chart: {
      height: 110,
      type: "area",
      parentHeightOffset: 0,
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    tooltip: { enabled: false },
    markers: {
      colors: "transparent",
      strokeColors: "transparent",
    },
    grid: { show: false },
    colors: [currentTheme.success],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.8,
        opacityFrom: 0.6,
        opacityTo: 0.1,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      width: 2,
      curve: "smooth",
    },
    xaxis: {
      show: true,
      lines: { show: false },
      labels: { show: false },
      stroke: { width: 0 },
      axisBorder: { show: false },
    },
    yaxis: {
      stroke: { width: 0 },
      show: false,
    },
  },
};

const fetchChannelType = async () => {
  try {
    const response = await projectStore.fetchChannels().catch((error) => error);
    var total = response?.data;
    total = total.map((v) => v.replace("MESSAGE_", ""));
    channelItems.value = total.filter((v) => {
      return (
        v !== "ORIGINAL" &&
        v !== "HOLD" &&
        v !== "QUEUED" &&
        v !== "REJECTED" &&
        v !== "TEMP_INBOUND"
      );
    });
    console.log("channel types", total, channelItems);
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchAgent = async () => {
  try {
    const response = await projectStore.fetchAgents().catch((error) => error);
    listAgents.value = response?.data;
    console.log("channel types 2", listAgents);
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchTeam = async () => {
  try {
    const response = await projectStore.fetchTeams().catch((error) => error);
    listTeams.value = response?.data;
    console.log("channel types 3", listTeams);
  } catch (error) {
    console.error("analytics error", error);
  }
};

const fetchOpenChat = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchOpenChats(
      start,
      end,
      chan,
      agent,
      type
    );
    const total = response?.data?.results?.[0]?.totalStatusOpen;
    if (total != null) statsAgent.value[0].stats = String(total);
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchResolvedChat = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchResolvedChats(
      start,
      end,
      chan,
      agent,
      type
    );
    const data = response?.data?.results?.[0];
    if (data?.resolvedCount != null && data?.expiredCount != null) {
      statsAgent.value[1].stats = String(data.resolvedCount);
      statsAgent.value[2].stats = String(data.expiredCount);
    }
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchSatScore = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchSatScores(
      start,
      end,
      chan,
      agent,
      type
    );
    const total = response?.data?.results?.[0]?.avgScore;
    if (total != null)
      statsAgent.value[3].stats = String(Math.round(total * 100) / 100);
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchBotOpenChat = async (start, end, chan) => {
  try {
    const response = await projectStore.fetchBotOpenChats(start, end, chan);
    const total = response?.data?.results?.[0]?.totalStatusOpen;
    if (total != null) statsBot.value[0].stats = String(total);
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchBotResolvedChat = async (start, end, chan) => {
  try {
    const response = await projectStore.fetchBotResolvedChats(start, end, chan);
    const data = response?.data?.results?.[0];
    if (data?.resolvedCount != null && data?.closedCount != null) {
      statsBot.value[1].stats = String(data.resolvedCount);
      statsBot.value[2].stats = String(data.closedCount);
    }
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchBotSatScore = async (start, end, chan) => {
  try {
    const response = await projectStore.fetchBotSatScores(start, end, chan);
    const total = response?.data?.results?.[0]?.avgScore;
    if (total != null)
      statsBot.value[3].stats = String(Math.round(total * 100) / 100);
  } catch (error) {
    console.error("analytics error", error);
  }
};

const fetchLeadMsg = async (start, end, agent, type) => {
  try {
    const response = await projectStore.fetchLeadMsgs(start, end, agent, type);
    const total = response?.data?.data?.messengerSharePercentage;
    if (total != null) {
      statsLead.value[0].stats = `${String(total || 0)} %`;
      statsLead.value[0].title = `Lead Messenger (${response?.data?.data?.leadMessenger})`;
    }
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchStartLag = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchStartLags(
      start,
      end,
      chan,
      agent,
      type
    );
    const total = response?.data?.data?.averageStartLag;
    if (total != null) statsLead.value[1].stats = String(formatDuration(total));
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchAvgResponse = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchAvgResponses(
      start,
      end,
      chan,
      agent,
      type
    );
    const total = response?.data?.data?.averageResponseTime;
    if (total != null) statsLead.value[2].stats = String(formatDuration(total));
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchAvgDuration = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchAvgDurations(
      start,
      end,
      chan,
      agent,
      type
    );
    const total = response?.data?.data?.averageAssignedDuration;
    if (total != null) statsLead.value[3].stats = String(formatDuration(total));
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchTotalConv = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchTotalConvs(
      start,
      end,
      chan,
      agent,
      type
    );
    const total = response?.data?.data?.totalConversations;
    if (total != null) convoStats.value[0].stats = String(total);
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchUniqueConv = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchUniqueConvs(
      start,
      end,
      chan,
      agent,
      type
    );
    const total = response?.data?.data?.uniqueConversations;
    if (total != null) convoStats.value[1].stats = String(total);
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchActiveUserStats = async (start, end, chan) => {
  try {
    const response = await projectStore.fetchActiveUsers(start, end, 'DAU', chan);
    const results = response?.data?.results || [];
    let total = 0;
    results.forEach(day => {
      Object.values(day.channels || {}).forEach(ch => {
        total += ch.valueLocal || 0;
      });
    });
    convoStats.value[2].stats = String(total);
  } catch (error) {
    console.error("analytics error", error);
  }
};
const fetchCampaignData = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchCampaignDatas(
      start,
      end,
      chan,
      agent,
      type
    );
    const result = Object.values(response.data.data).reduce(
      (acc, item) => {
        acc.total += item.total || 0;
        acc.read += item.read || 0;
        acc.delivered += item.delivered || 0;
        acc.responded += item.responded || 0;
        return acc;
      },
      { total: 0, read: 0, delivered: 0, responded: 0 }
    );
    if (result != null) {
      statsCamp.value[0].stats = String(result.total);
      statsCamp.value[1].stats = String(result.delivered);
      statsCamp.value[2].stats = String(result.read);
      statsCamp.value[3].stats = String(result.responded);
    }
  } catch (error) {
    console.error("analytics error", error);
  }
};

const fetchChartData = async (start, end, chan, agent, type) => {
  try {
    const response = await projectStore.fetchChartDatas(
      start,
      end,
      chan,
      agent,
      type
    );
    const results = response?.data?.results || [];

    // Extract all unique agents
    const agentSet = new Set();
    results.forEach((block) => {
      Object.keys(block.data).forEach((agent) => agentSet.add(agent));
    });

    const agents = Array.from(agentSet);

    // const labels = results.map(block => new Date(block.rangeStart).toLocaleDateString());
    const isSingleDay =
      new Date(start).toDateString() === new Date(end).toDateString();
    const labels = results.map((block) => {
      const date = new Date(block.rangeStart);
      return isSingleDay
        ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) // eg: 03:15 PM
        : date.toLocaleDateString("en-GB"); // eg: 13/05/2025
    });

    const colorKeys = Object.keys(chartJsCustomColors);
    const datasets = agents.map((agent, index) => {
      const color = chartJsCustomColors[colorKeys[index % colorKeys.length]];

      const data = results.map((block) => {
        const agentData = block.data[agent];
        return {
          total: agentData
            ? agentData.open + agentData.resolved + agentData.expired
            : 0,
          open: agentData?.open || 0,
          resolved: agentData?.resolved || 0,
          expired: agentData?.expired || 0,
        };
      });

      return {
        label: agent,
        data: data.map((item) => item.total),
        meta: data,
        fill: false,
        tension: 0.5,
        pointRadius: 1,
        pointHoverRadius: 5,
        pointStyle: "circle",
        borderColor: color,
        backgroundColor: color,
        pointHoverBorderWidth: 5,
        pointHoverBorderColor: color,
        pointBorderColor: "transparent",
        pointHoverBackgroundColor: color,
      };
    });
    const allValues = datasets.flatMap((ds) => ds.data);
    const maxY = Math.max(...allValues);
    const yMax = maxY < 5 ? 5 : Math.ceil(maxY * 1.1);

    chartData.value = { labels, datasets };

    chartOptions.value = {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const dataset = context.dataset;
              const index = context.dataIndex;
              const meta = dataset.meta?.[index] || {};

              return [
                `${dataset.label}: ${meta.total}`,
                `Open: ${meta?.open}`,
                `Resolved: ${meta?.resolved}`,
                `Expired: ${meta?.expired}`,
              ];
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: yMax,
          ticks: {
            stepSize: 1,
          },
        },
      },
    };
  } catch (error) {
    console.error("fetchChartData error:", error);
  }
};

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0 second";
  seconds = seconds / 1000;

  if (seconds >= 86400) {
    const days = (seconds / 86400).toFixed(2);
    return `${days} day${days >= 2 ? "s" : ""}`;
  } else if (seconds >= 3600) {
    const hours = (seconds / 3600).toFixed(2);
    return `${hours} hour${hours >= 2 ? "s" : ""}`;
  } else if (seconds >= 60) {
    const minutes = (seconds / 60).toFixed(2);
    return `${minutes} min${minutes >= 2 ? "s" : ""}`;
  } else {
    return `${seconds.toFixed(0)} second${seconds >= 2 ? "s" : ""}`;
  }
};
const onDateSelect = (selectedDates, dateStr) => {
  console.log("Selected:", selectedDates, dateStr);
};
const onDateUpdate = (selectedDates, dateStr) => {
  console.log("Updated:", selectedDates, dateStr);
};

const onDateClosed = (selectedDates, dateStr) => {
  console.log("Closed:", selectedDates, toRaw(oldDates.value), dateStr);
  if (selectedDates.length === 2 && toRaw(oldDates.value) != selectedDates) {
    oldDates.value = selectedDates;
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDates[1]);
    endDate.setHours(23, 59, 59, 999);
    allAnalytics(
      start.getTime(),
      endDate.getTime(),
      selectedChannelItem.value,
      selectedAgentTeamItem.value.dept_id
        ? selectedAgentTeamItem.value.code
        : selectedAgentTeamItem.value.id,
      selectedAgentTeamItem.value.dept_id ? "agent" : "team"
    );
  }
};

const allAnalyticsWithoutDate = () => {
  console.log(
    "channs",
    selectedChannelItem,
    selectedAgentTeamItem,
    dateRange.value
  );
  let startStr = "";
  let endStr = "";
  if (dateRange.value.includes("to"))
    [startStr, endStr] = dateRange.value.split(" to ");
  else startStr = endStr = dateRange.value;
  const [startDay, startMonth, startYear] = startStr.split("-").map(Number);
  const [endDay, endMonth, endYear] = endStr.split("-").map(Number);

  const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
  const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
  console.log("no date", startDate, endDate);
  allAnalytics(
    startDate.getTime(),
    endDate.getTime(),
    selectedChannelItem.value,
    selectedAgentTeamItem.value.dept_id
      ? selectedAgentTeamItem.value.code
      : selectedAgentTeamItem.value.id,
    selectedAgentTeamItem.value.dept_id ? "agent" : "team"
  );
};
const allAnalytics = (start, end, chan, agent, type) => {
  console.log("all an", start, end);
  fetchOpenChat(start, end, chan, agent, type);
  fetchResolvedChat(start, end, chan, agent, type);
  fetchSatScore(start, end, chan, agent, type);
  fetchBotOpenChat(start, end, chan);
  fetchBotResolvedChat(start, end, chan);
  fetchBotSatScore(start, end, chan);
  fetchLeadMsg(start, end, agent, type);
  fetchStartLag(start, end, chan, agent, type);
  fetchAvgResponse(start, end, chan, agent, type);
  fetchAvgDuration(start, end, chan, agent, type);
  fetchTotalConv(start, end, chan, agent, type);
  fetchUniqueConv(start, end, chan, agent, type);
  fetchCampaignData(start, end, chan, agent, type);
  fetchChartData(start, end, chan, agent, type);
  fetchActiveUserStats(start, end, chan);
};

onBeforeMount(() => {
  console.log("started before mount");
});
onMounted(async () => {
  console.log("started mounting");
  await fetchChannelType();
  await fetchAgent();
  await fetchTeam();
  const allChan = ["All Channels"];
  const allTeam = [{ name: "All Agents", code: "all_teams", id: "all_teams" }];

  agentTeamItems.value = [
    ...allTeam,
    ...(listAgents.value?.results || []),
    ...(listTeams.value?.results || []),
  ];
  channelItems.value = [...allChan, ...(channelItems?.value || [])];
  console.log("All data", agentTeamItems, channelItems, listAgents, listTeams);

  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);

  const formattedStart = oneWeekAgo
    .toLocaleDateString("en-GB")
    .split("/")
    .join("-");
  const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-");
  dateRange.value = `${formattedStart} to ${formattedEnd}`;
  console.log("before mount", oneWeekAgo.getTime(), today.getTime());
  allAnalytics(
    oneWeekAgo.getTime(),
    today.getTime(),
    selectedChannelItem.value,
    selectedAgentTeamItem.value.dept_id
      ? selectedAgentTeamItem.value.code
      : selectedAgentTeamItem.value.id,
    selectedAgentTeamItem.value.dept_id ? "agent" : "team"
  );
});
</script>

<template>
  <VRow class="match-height">
    <div style="width: 100%; display: flex; justify-content: flex-end">
      <VMenu transition="scale-transition" style="min-width: 200px !important">
        <template #activator="{ props }">
          <VBtn v-bind="props">
            {{ selectedChannelItem || "Select an option" }}
          </VBtn>
        </template>

        <VList>
          <VListItem
            v-for="(item, index) in channelItems"
            :key="index"
            @click="
              () => {
                selectedChannelItem = item;
                allAnalyticsWithoutDate();
              }
            "
          >
            <VListItemTitle>{{ item }}</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
      <div style="margin: 0 15px">
        <VMenu
          transition="scale-transition"
          style="min-width: 200px !important"
        >
          <template #activator="{ props }">
            <VBtn v-bind="props">
              {{ selectedAgentTeamItem?.name || "Select an option" }}
            </VBtn>
          </template>

          <VList>
            <VListItem
              v-for="(item, index) in agentTeamItems"
              :key="index"
              @click="
                () => {
                  selectedAgentTeamItem = item;
                  allAnalyticsWithoutDate();
                }
              "
            >
              <VListItemTitle>{{ item.name }}</VListItemTitle>
            </VListItem>
          </VList>
        </VMenu>
      </div>
      <AppDateTimePicker
        style="width: 250px; margin-left: auto; margin-right: 12px"
        v-model="dateRange"
        prepend-inner-icon="tabler-calendar"
        :config="{
          mode: 'range',
          dateFormat: 'd-m-Y',
          position: 'auto right',
          onChange: onDateSelect,
          onValueUpdate: onDateUpdate,
          onClose: onDateClosed,
          plugins: [customPlugin],
        }"
      />
    </div>

    <VCol
      v-for="statistics in statsAgent"
      :key="statistics.title + '_' + statistics.stats"
      cols="12"
      sm="6"
      md="3"
    >
      <CardStatisticsHorizontal v-bind="statistics" />
    </VCol>

    <VCol
      v-for="statistics in statsBot"
      :key="statistics.title + '_' + statistics.stats"
      cols="12"
      sm="6"
      md="3"
    >
      <CardStatisticsHorizontal v-bind="statistics" />
    </VCol>

    <VCol
      v-for="statistics in statsLead"
      :key="statistics.title + '_' + statistics.stats"
      cols="12"
      sm="6"
      md="3"
    >
      <CardStatisticsHorizontal v-bind="statistics" />
    </VCol>

    <VCol cols="12" md="6">
      <CardStatisticsTransactions
        :statistics="statsCamp"
        :title="'Campaign Statistics'"
      />
    </VCol>

    <VCol
      v-for="statistics in convoStats"
      :key="statistics.title + '_' + statistics.stats"
      md="2"
      cols="6"
    >
      <CardStatisticsVerticalSimple v-bind="statistics" />
    </VCol>

    <VCol cols="12">
      <VCard
        title="Conversation Statistics"
        subtitle="Number of Chats per agent"
      >
        <VCardText>
          <ChartJsLineChart
            style="width: 100%; height: 80%"
            :colors="chartJsCustomColors"
            :chartOption="chartOptions"
            :data="chartData"
          />
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@app-insights360/@core/scss/template/libs/apex-chart.scss";
</style>
<style>
.flatpickr-custom-btn {
  font-size: 12px;
  background: #eee;
  border: 1px solid #ccc;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: black;
}
.flatpickr-custom-btn:hover {
  background-color: #ddd;
}
</style>
