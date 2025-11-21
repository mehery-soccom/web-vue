<script setup>
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref, onMounted, watch } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();

const tempTable = ref([]);
const isLoading = ref(false);
const selectedType = ref("Active");
const typeOptions = ["All", "Open", "Active"];

const oldDates = ref([]);
const today = new Date();
const oneWeekAgo = new Date();
const formattedStart = oneWeekAgo.toLocaleDateString("en-GB").split("/").join("-");
const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-");
const dates = `${formattedStart} to ${formattedEnd}`;
const dateRange = ref(dates);

const headers = [
  { title: "Assigned To", key: "assignedTo", sortable: false },
  { title: "Channel ID", key: "channelId", searchable: true, sortable: true },
  { title: "Contact ID", key: "contactId", searchable: true, sortable: true },
  { title: "Contact Type", key: "contactType", searchable: true, sortable: true },
  { title: "Status", key: "status", searchable: true, sortable: true },
  { title: "Start@", key: "startStamp", sortable: true },
];

const fetchSessions = async (start, end) => {
  isLoading.value = true;
  try {
    const typePayload = selectedType.value.toLowerCase();
    const response = await projectStore.fetchChatSessions(start, end, typePayload);
    
    if (response?.data) {
      const results = response.data.results || response.data || [];

      tempTable.value = results.map((item) => ({
        ...item,
        status: item.info?.status ? item.info.status : 'OPEN',
        assignedAgent: item.info?.assignedTo?.agent || '-',
        assignedTeam: item.info?.assignedTo?.team,
        assignedQueue: item.info?.assignedTo?.queue,
        startStamp: item.info?.start?.stamp || null,
        resolvedStamp: item.info?.resolved?.stamp || null,
        resolvedBy: item.info?.resolved?.by || '-',
        satisfactionScore: item.info?.satisfactionScore
      }));
      
      console.log("Chat Sessions Data:", tempTable.value);
    }
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    tempTable.value = [];
  } finally {
    isLoading.value = false;
  }
};

const onTypeChange = () => {
  const { start, end } = getDatesFromRange(dateRange.value);
  fetchSessions(start, end);
};

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 2) {
    oldDates.value = selectedDates;
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDates[1]);
    endDate.setHours(23, 59, 59, 999);
    
    fetchSessions(start.getTime(), endDate.getTime());
  }
};

const formatCustomDate = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput; 

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  
  return `${time} ${date}`;
};

const getDatesFromRange = (rangeStr) => {
  let startStr = "";
  let endStr = "";
  
  if (rangeStr.includes(" to ")) {
    [startStr, endStr] = rangeStr.split(" to ");
  } else {
    startStr = endStr = rangeStr;
  }

  const [startDay, startMonth, startYear] = startStr.split("-").map(Number);
  let endDay, endMonth, endYear;
  if(endStr) {
     [endDay, endMonth, endYear] = endStr.split("-").map(Number);
  } else {
     [endDay, endMonth, endYear] = [startDay, startMonth, startYear];
  }

  const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
  const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
  
  return { start: startDate.getTime(), end: endDate.getTime() };
};

const exportToExcel = () => {
  const formattedData = tempTable.value.map((item) => ({
    "ContactId": item.contactId || '-',
    "SessionId": item.sessionId || '-',
    "Channel Id": item.channelId || '-',
    "ChannelType": item.contactType || '-',
    "Chat Start Time": formatTimeDay(item.startStamp),
    "Chat Start Date": formatDateOnly(item.startStamp),
    "Assigned Agent Name": item.assignedAgent,
    "Session End Time": item.resolvedStamp ? new Date(item.resolvedStamp).toLocaleString() : '-',
    "Close By Agent Name": item.resolvedBy,
    "Chat Resolution Time": formatDuration(item.startStamp, item.resolvedStamp),
    "Feedback Score": item.satisfactionScore || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ChatSessions");
  
  const fileName = `Chat-Sessions-${selectedType.value}-${dateRange.value}.xlsx`.replaceAll(" ", "-");
  XLSX.writeFile(workbook, fileName);
};

onMounted(() => {
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  fetchSessions(start.getTime(), now.getTime());
});

const formatTimeDay = (val) => {
  if (!val) return '-';
  const date = new Date(val);
  if (isNaN(date.getTime())) return '-';
  // Format: 09:04 pm Tue
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${time} ${day}`;
};

const formatDateOnly = (val) => {
  if (!val) return '-';
  const date = new Date(val);
  if (isNaN(date.getTime())) return '-';
  // Format: 17/10/2025
  return date.toLocaleDateString('en-GB');
};

const formatDuration = (start, end) => {
  if (!start || !end) return '-';
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return '-';
  
  const diff = Math.abs(e - s) / 1000;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const sec = Math.floor(diff % 60);
  
  // Format: 0:08:14
  return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};
</script>

<template>
  <VRow>
    <div style="width: 100%; display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding-right: 12px;">
      
      <VBtn
        @click="exportToExcel"
        color="primary"
        style="width: 40px; height: 40px; min-width: 40px"
        class="pa-0"
        variant="flat"
      >
        <VIcon>mdi-download</VIcon>
      </VBtn>

      <VSelect
        v-model="selectedType"
        :items="typeOptions"
        density="compact"
        variant="outlined"
        hide-details
        style="width: 150px"
        label="Type"
        @update:modelValue="onTypeChange"
      ></VSelect>

      <AppDateTimePicker
        style="width: 250px;"
        v-model="dateRange"
        prepend-inner-icon="tabler-calendar"
        :config="{
          mode: 'range',
          dateFormat: 'd-m-Y',
          position: 'auto right',
          maxDate: 'today',
          onClose: onDateClosed,
          plugins: [customPlugin],
        }"
      />
    </div>

    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="headers"
        :loading="isLoading"
        :productList="tempTable"
        :title="'Chat Sessions'"
      >
        <template #item.assignedTo="{ item }">
          <span>
            {{ item.raw.assignedAgent }}
            <span v-if="item.raw.assignedTeam" class="text-caption text-medium-emphasis">
              ({{ item.raw.assignedTeam }})
            </span>
            <span v-if="item.raw.assignedQueue" class="text-caption text-medium-emphasis">
              | {{ item.raw.assignedQueue }}
            </span>
          </span>
        </template>
        <template #item.channelId="{ item }">
          <span style="font-weight: 500;">{{ item.raw.channelId }}</span>
        </template>

        <template #item.contactId="{ item }">
          <span>{{ item.raw.contactId }}</span>
        </template>

        <template #item.contactType="{ item }">
           <span>{{ item.raw.contactType }}</span>
        </template>

        <template #item.status="{ item }">
            <span>{{ item.raw.status }}</span>
        </template>
        
        <template #item.startStamp="{ item }">
             <span>{{ formatCustomDate(item.raw.startStamp) }}</span>
        </template>

      </DemoDataTableKitchenSink>
    </VCol>
  </VRow>
</template>

<style scoped>
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