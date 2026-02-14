<script setup>
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();
const tempTable = ref([]);
const isLoading = ref(false);
const headers = [
  { title: "Agent", key: "agent", searchable: true, sortable: true },
  { title: "Team", key: "deptName", searchable: true },
  { title: "Status", key: "activity", sortable: false, filterable: true, filterOptions: ["","online", "away", "offline"]},
  { title: "No. of Conv", key: "totalConversations", information: "Number of Conversations" },
  { title: "Av Start Lag", key: "averageStartLag" },
  { title: "Av Response Time", key: "averageResponseTime" },
  { title: "Duration", key: "averageAssignedDuration" },
  { title: "Open", key: "openConversations", sortable: true },
  { title: "Resolved", key: "resolvedConversations", sortable: true },
  { title: "Expired", key: "expiredConversations", sortable: true },
  { title: "Feedback", key: "averageSatisfaction", sortable: true },
];

const fetchAgentData = async (start, end) => {
  isLoading.value = true;
  try {
    const response = await projectStore.fetchAgentDatas(start, end);
    if (response?.data?.results != null) {
      const resultsWithActivity = response.data.results.map((item) => ({
        ...item,
        activity: findStatus(item.session),
      }));
      tempTable.value = resultsWithActivity;
      console.log("ana", tempTable.value);
    }
  } catch (error) {
    console.error("analytics error", error);
  } finally {
    isLoading.value = false;
  }
};

const oldDates = ref([]);
const today = new Date();
var tonight = new Date();
tonight.setHours(23, 59, 59, 999);
var oneWeekAgo = new Date();
// oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
const formattedStart = oneWeekAgo
  .toLocaleDateString("en-GB")
  .split("/")
  .join("-");
const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-");
const dates = `${formattedStart} to ${formattedEnd}`;
var dateRange = ref(dates);

const onDateSelect = (selectedDates, dateStr) => {
  console.log("Selected:", selectedDates, dateStr);
};
const onDateUpdate = (selectedDates, dateStr) => {
  console.log("Updated:", selectedDates, dateStr);
};

const onDateClosed = (selectedDates, dateStr) => {
  console.log("Closed:", selectedDates, oldDates.value, dateStr);
  if (selectedDates.length === 2 && oldDates.value != selectedDates) {
    oldDates.value = selectedDates;
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDates[1]);
    endDate.setHours(23, 59, 59, 998);
    fetchAgentData(start.getTime(), endDate.getTime());
  }
};

const formatDuration = (seconds) => {
  // console.log("time vals", seconds)
  if (!seconds || isNaN(seconds)) return "-";
  seconds = seconds / 1000;

  if (seconds >= 86400) {
    const days = (seconds / 86400).toFixed(2);
    return `${days} d`;
  } else if (seconds >= 3600) {
    const hours = (seconds / 3600).toFixed(2);
    return `${hours} h`;
  } else if (seconds >= 60) {
    const minutes = (seconds / 60).toFixed(2);
    return `${minutes} m`;
  } else {
    return `${seconds.toFixed(0)} s`;
  }
};
const formatDurationHHMMSS = (ms) => {
  if (ms === null || ms === undefined || isNaN(ms)) return "-";

  let totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
const findStatus = (sess) => {
  var awayStamp = new Date().getTime() - 600000;
  var offlineStamp = awayStamp - 600000 * 2;
  let activity = "offline";
  if (!sess) activity = "offline";
  else {
    const session = sess;
    if (session && Object.keys(session).length > 0)
      session.isLoggedIn =
        session.isLoggedIn && session.lastOnlineStamp > offlineStamp;
    if (session && Object.keys(session).length > 0)
      session.isAway =
        session.isOnline &&
        session.isLoggedIn &&
        session.lastOnlineStamp < awayStamp;
    if (!session || !session.isEnabled || !session.isLoggedIn)
      activity = "offline";
    else if (session.isAway) activity = "away";
    else if (session.isOnline) activity = "online";
    // console.log(
    //   "sess 2",
    //   sess,
    //   sess.isOnline,
    //   session.isAway,
    //   !session || !session.isEnabled || !session.isLoggedIn
    // );
  }
  return activity;
};

const exportToExcel = () => {
  const formattedData = tempTable.value.map((item) => ({
    Agent: item.agent,
    Team: item.deptName,
    Status: item.activity,
    "No. of Conversation": item.totalConversations,
    "Avg. Start Lag": formatDuration(item.averageStartLag),
    "Avg. Response Time": formatDuration(item.averageResponseTime),
    Duration: formatDurationHHMMSS(item.averageAssignedDuration),
    Open: item.openConversations,
    Resolved: item.resolvedConversations,
    Expired: item.expiredConversations,
    Feedback: item.averageSatisfaction,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const fileName = `Agent-data-${dateRange.value}.xlsx`.replaceAll(" ", "-");
  XLSX.writeFile(workbook, fileName);
};
const allAnalytics = () => {
  console.log("channs", dateRange.value);
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
  fetchAgentData(startDate.getTime(), endDate.getTime());
};

onMounted(async () => {
  const now = new Date();
  const oneWeekAgo = new Date();
  // oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);
  fetchAgentData(oneWeekAgo.getTime(), now.setHours(23,59,59,998));
});
</script>

<template>
  <VRow>
    <div style="width: 100%; display: flex; justify-content: flex-end">
      <VBtn
        @click="exportToExcel"
        color="primary"
        style="width: 40px; height: 40px; min-width: 40px"
        class="pa-0 ml-3"
        variant="flat"
      >
        <VIcon>mdi-download</VIcon>
      </VBtn>
      <AppDateTimePicker
        style="width: 250px; margin-left: auto; margin: 0 12px"
        v-model="dateRange"
        prepend-inner-icon="tabler-calendar"
        :config="{
          mode: 'range',
          dateFormat: 'd-m-Y',
          maxDate: tonight,
          position: 'auto right',
          onClose: onDateClosed,
          plugins: [customPlugin],
        }"
      />
    </div>
    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="headers" :loading="isLoading"
        :productList="tempTable"
        :title="'Agent Data'"
      >
        <template #item.agent="{ item }">
          <span style="min-width: 100px; display: inline-block">{{
            item.raw.agent
          }}</span>
        </template>
        <template #item.deptName="{ item }">
          <span style="min-width: 100px; display: inline-block">{{
            item.raw.deptName
          }}</span>
        </template>
        <template #item.totalConversations="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.totalConversations }}</span
          >
        </template>
        <template #item.averageStartLag="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatDuration(item.raw.averageStartLag) }}</span
          >
        </template>

        <template #item.averageResponseTime="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatDuration(item.raw.averageResponseTime) }}</span
          >
        </template>

        <template #item.averageAssignedDuration="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ formatDuration(item.raw.averageAssignedDuration) }}</span
          >
        </template>
        <template #item.openConversations="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.openConversations }}</span
          >
        </template>
        <template #item.resolvedConversations="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.resolvedConversations }}</span
          >
        </template>
        <template #item.expiredConversations="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.expiredConversations }}</span
          >
        </template>
        <template #item.averageSatisfaction="{ item }">
          <span v-if="item.raw.averageSatisfaction">{{
            String(Math.round(item.raw.averageSatisfaction * 100) / 100)
          }}</span>
          <span v-else>0</span>
        </template>
        <template #item.activity="{ item }">
          <span style="width: 100%; display: inline-block; text-align: center">
            <span
              v-if="item.raw.activity === 'online'"
              class="status-dot green-dot"
            ></span>
            <span
              v-else-if="item.raw.activity === 'away'"
              class="status-dot orange-dot"
            ></span>
            <span v-else class="status-dot red-dot"></span>
          </span>
        </template>
      </DemoDataTableKitchenSink>
    </VCol>
  </VRow>
</template>

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
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.green-dot {
  background-color: rgb(10, 200, 10);
}
.red-dot {
  background-color: red;
}
.orange-dot {
  background-color: orange;
}
</style>
