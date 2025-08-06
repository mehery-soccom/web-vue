<script setup>
import AnalyticsMonthlyCampaignState from "@/app-insights360/views/dashboards/analytics/AnalyticsMonthlyCampaignState.vue";
import DemoDataTableKitchenSink from "@/app-insights360/views/tables/DemoDataTableKitchenSink.vue";
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { ref } from "vue";
import * as XLSX from "xlsx";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();
const channelItems = ref();
const selectedChannelItem = ref("All Channels");
const tempCharts = ref([]);
const tempTable = ref([]);
const headers = [
  { title: "Template", key: "templateCode", searchable: true },
  { title: "Channel", key: "channelId", searchable: true },
  { title: "Category", key: "templateType", searchable: true },
  { title: "Sent", key: "total", sortable: true },
  { title: "Delivered", key: "delivered", sortable: true },
  { title: "Read", key: "read", sortable: true },
  { title: "Replied", key: "responded", sortable: true },
  { title: "Failed", key: "failed", sortable: true },
];
const exportToExcel = () => {
  const formattedData = tempTable.value.map((item) => ({
    Template: item.templateCode,
    Channel: item.channelId,
    Category: item.templateType,
    Sent: item.total,
    Delivered: item.delivered,
    Read: item.read,
    Replied: item.responded,
    Failed: item.failed,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const fileName = `Template-data-${dateRange.value}.xlsx`.replaceAll(" ", "-");
  XLSX.writeFile(workbook, fileName);
};

const fetchTemplateData = async (start, end, chan, bool) => {
  try {
    const response = await projectStore.fetchTemplateDatas(start, end, chan);
    if (response?.data?.data != null) {
      tempCharts.value = Object.entries(response?.data?.data).map(
        ([channel, data]) => ({ title: channel, ...data })
      );
      tempTable.value = response?.data?.results;
      if (!bool)
        channelItems.value = [
          "All Channels",
          ...Object.keys(response?.data?.data || {}),
        ];
      console.log("ana", tempCharts.value, tempTable.value);
    }
  } catch (error) {
    console.error("analytics error", error);
  }
};

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
    fetchTemplateData(
      start.getTime(),
      endDate.getTime(),
      selectedChannelItem.value,
      false
    );
  }
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
  fetchTemplateData(
    startDate.getTime(),
    endDate.getTime(),
    selectedChannelItem.value,
    true
  );
};

onMounted(async () => {
  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);
  fetchTemplateData(oneWeekAgo.getTime(), now.getTime(), "All Channels", false);
});
</script>

<template>
  <VRow>
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
                allAnalytics();
              }
            "
          >
            <VListItemTitle>{{ item }}</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
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
    <VCol
      v-for="(campaign, index) in tempCharts"
      :key="index"
      cols="12"
      :sm="tempCharts.length <= 2 ? 6 : 4"
    >
      <AnalyticsMonthlyCampaignState
        :statistics="campaign"
        :title="`${campaign.title} `"
      />
    </VCol>
    <VCol cols="12">
      <DemoDataTableKitchenSink
        :headers="headers"
        :productList="tempTable"
        :title="'Template Data'"
      >
        <template #item.total="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.value.total }}</span
          >
        </template>
        <template #item.delivered="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.value.delivered }}</span
          >
        </template>
        <template #item.read="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.value.read }}</span
          >
        </template>
        <template #item.responded="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.value.responded }}</span
          >
        </template>
        <template #item.failed="{ item }">
          <span
            style="width: 100%; display: inline-block; text-align: center"
            >{{ item.value.failed }}</span
          >
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
}
.flatpickr-custom-btn:hover {
  background-color: #ddd;
}
</style>
