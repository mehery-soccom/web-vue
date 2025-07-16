<script setup>
import CardStatisticsTransactions from "@/app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue";
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
// import { ref } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();
const channelItems = ref();
const selectedChannelItem = ref("All Channels");
const campCharts = ref([]);
const campTable = ref([]);
const headers = [
  { title: "Campaign", key: "name", searchable: true },
  { title: "Channel", key: "channelId", searchable: true },
  { title: "Template", key: "templateName", searchable: true },
  { title: "Status", key: "status", searchable: true },
  { title: "Total", key: "total", sortable: true },
  { title: "Sent", key: "sent", sortable: true },
  { title: "Delivered", key: "delivered", sortable: true },
  { title: "Read", key: "read", sortable: true },
  { title: "Replied", key: "responded", sortable: true },
  { title: "Failed", key: "failed", sortable: true },
];
const statsCamp = ref([
  {
    title: "Whatsapp",
    stats: "0",
    icon: "tabler-brand-whatsapp",
    color: "primary",
  },
  {
    title: "Email",
    stats: "0",
    icon: "tabler-mail",
    color: "info",
  },
  {
    title: "Sms",
    stats: "0",
    icon: "tabler-message-dots",
    color: "success",
  },
]);

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
    fetchCampaignData(
      start.getTime(),
      endDate.getTime(),
      selectedChannelItem.value,
      false,
      selectedStatuses.value
    );
  }
};

const fetchCampaignData = async (start, end, chan, bool, stats) => {
  try {
    const response = await projectStore.fetchCampaignPageDatas(
      start,
      end,
      chan,
      stats
    );
    if (response?.data?.data != null) {
      campCharts.value = Object.entries(response?.data?.data).map(
        ([channel, data]) => ({ title: channel, ...data })
      );
      statsCamp.value[0].stats = String(
        response?.data?.data?.WHATSAPP?.total || 0
      );
      statsCamp.value[1].stats = String(
        response?.data?.data?.EMAIL?.total || 0
      );
      statsCamp.value[2].stats = String(response?.data?.data?.SMS?.total || 0);
      campTable.value = response?.data?.results;
      if (!bool)
        channelItems.value = [
          "All Channels",
          ...Object.keys(response?.data?.data || {}),
        ];
    }
  } catch (error) {
    console.error("analytics error", error);
  }
};

const exportToExcel = () => {
  const formattedData = campTable.value.map((item) => ({
    Campaign: item.name,
    Channel: item.channelId,
    Template: item.templateName,
    Status: item.status,
    Total: item.total,
    Sent: item.sent,
    Delivered: item.delivered,
    Read: item.read,
    Replied: item.responded,
    Failed: item.failed,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const fileName = `Campaign-data-${dateRange.value}.xlsx`.replaceAll(" ", "-");
  XLSX.writeFile(workbook, fileName);
};
const allAnalytics = () => {
  console.log("channs", selectedChannelItem, dateRange.value);
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
  fetchCampaignData(
    startDate.getTime(),
    endDate.getTime(),
    selectedChannelItem.value,
    true,
    selectedStatuses.value
  );
};
const statusOptions = [
  "COMPLETED",
  "EXECUTING",
  "CREATED",
  "READING",
  "CANCELLED",
];
const selectedStatuses = ref([]);
const menuOpen = ref(false);

watch(menuOpen, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    console.log("Selected Statuses:", selectedStatuses.value);
    allAnalytics();
  }
});

onMounted(async () => {
  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);
  fetchCampaignData(
    oneWeekAgo.getTime(),
    now.getTime(),
    "All Channels",
    false,
    selectedStatuses.value
  );
});
</script>

<template>
  <VRow>
    <div style="width: 100%; display: flex; justify-content: flex-end">
      <VSelect
        v-model="selectedStatuses"
        :items="statusOptions"
        multiple
        placeholder="Choose Statuses"
        persistent-placeholder
        class="compact-multiselect"
        v-model:menu="menuOpen"
      >
        <template #selection="{ item, index }">
          <span
            style="
              background-color: #ddd;
              border: 0.5px solid gray;
              padding: 0 8px 3px 8px;
              margin-right: 10px;
              border-radius: 3px;
            "
            v-if="index === 0"
          >
            {{
              statusOptions.find((c) => c === selectedStatuses[0]) ||
              selectedStatuses[0]
            }}
          </span>
          <span v-else-if="index === 1" class="text-muted">
            +{{ selectedStatuses.length - 1 }}</span
          >
        </template>
      </VSelect>
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
          position: 'auto right',
          onChange: onDateSelect,
          onValueUpdate: onDateUpdate,
          onClose: onDateClosed,
          plugins: [customPlugin],
        }"
      />
    </div>
    <VCol cols="12" md="12">
      <CardStatisticsTransactions
        :statistics="statsCamp"
        :title="'Campaign Statistics'"
      />
    </VCol>
    <!-- <VCol v-for="(campaign, index) in campCharts" :key="index" cols="12" :sm="campCharts.length === 3 ? 4 : 6">
      <AnalyticsMonthlyCampaignState :statistics="campaign" :title="`${campaign.title} `" />
    </VCol> -->
    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="headers"
        :productList="campTable"
        :title="'Campaign Data'"
      >
        <template #item.name="{ item }">
          <RouterLink
            :to="{
              name: 'views-outbound-id',
              params: { id: item.raw.campaignCode },
            }"
            style="width: 100%; display: inline-block; text-align: center"
          >
            {{ item.raw.name }}
          </RouterLink>
        </template>
        <!-- <IconBtn
          :to="{
            name: 'admin-push-notification-templates-edit-id',
            params: { id: item.raw._id },
          }"
        >
          <VIcon icon="mdi-pencil-outline" />
          <VTooltip activator="parent">Edit</VTooltip>
        </IconBtn> -->
        <template #item.total="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.total }}</span
          >
        </template>
        <template #item.sent="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.sent }}</span
          >
        </template>
        <template #item.delivered="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.delivered }}</span
          >
        </template>
        <template #item.read="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.read }}</span
          >
        </template>
        <template #item.responded="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.responded }}</span
          >
        </template>
        <template #item.failed="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.raw.failed }}</span
          >
        </template>
      </DemoDataTableKitchenSink>
    </VCol>
  </VRow>
</template>

<style>
.v-select {
  max-width: 210px;
  font-size: 0.85rem;
}
.compact-multiselect .v-select__selection {
  flex-wrap: nowrap !important;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  height: 24px; /* Keep it short like one line */
  line-height: 24px;
}
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
