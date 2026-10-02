<script setup>
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
// import { ref } from "vue";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";
import { smartFormatDate } from "@/app-insights360/@core/utils/formatters";
import debounce from "lodash/debounce";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();
const reportsTable = ref([]);
const isLoading = ref(false);
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [ ],
  multiSort: true,
  filters: {
    title: null,
    createdAt: null,
    type: null,
    status: null,
  },
});
const headers = [
  { title: "Report Name", key: "title" },
  { title: "Status", key: "status" },
  { title: "Type", key: "type", sortable: true },
  { title: "Created At", key: "createdAt", sortable: true },
  { title: "Start Date", key: "dateRange1" },
  { title: "End Date", key: "dateRange2" },
  { title: "Action", key: "action" },
];

const oldDates = ref([]);
const today = new Date();
var tonight = new Date();
tonight.setHours(23, 59, 59, 999);
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
    endDate.setHours(23, 59, 59, 998);
    fetchReportsData(pagination);
  }
};
const formatStamp = (stamp) => {
  if(!stamp) return null;
  const d = new Date(stamp);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);

  return `${hh}:${mm} ${day}/${month}/${year}`;
}
const onUpdateOptions = (options) => {
  pagination.itemsLength = options.itemsLength;
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;

  const startStr = dateRange.value.slice(0, 10);
  const endStr = dateRange.value.slice(-10);

  const [startDay, startMonth, startYear] = startStr.split("-");
  const [endDay, endMonth, endYear] = endStr.split("-");

  const startDate = new Date(`${startMonth}-${startDay}-${startYear}`).getTime();
  const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 998).getTime();
  console.log("daa", startStr, endStr, startDate, endDate)
  fetchReportsData(pagination);
};
const onUpdateOptionsDebounced = debounce((options) => {
  onUpdateOptions(options);
}, 300);

const downloadFile = (url, name) => {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const fetchReportsData = async (pagination) => {
  isLoading.value = true;
  try {
    const response = await projectStore.fetchDownloadableReportsData(pagination);
    if(response?.data?.pagination) pagination.itemsLength = response.data.pagination.total;
    console.log("sa", pagination.itemsLength, response.data.pagination.total)
    reportsTable.value = response?.data?.results;
  } catch (error) {
    console.error("analytics error", error);
  }finally{
    isLoading.value = false;
  }
};
</script>

<template>
  <VRow>
    <div style="width: 100%; display: flex; justify-content: flex-end">
      <VTooltip text="Refresh reports data">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            @click="fetchReportsData(pagination)"
            color="primary"
            style="width: 45px; height: 45px; min-width: 40px; margin: 0 12px;font-size: 20px;"
            class="pa-0"
            variant="flat"
          >
            <VIcon>mdi-sync</VIcon>
          </VBtn>
        </template>
      </VTooltip>
    </div>
    <VCol cols="12">
      <MyDataTable :headers="headers" :items="reportsTable" :loading="isLoading" 
        :server-side="true" v-bind="pagination" @update:options="onUpdateOptionsDebounced">
        <template #item.title="{ item }">
          <VTooltip location="top">
            <template #activator="{ props }">
              <span v-bind="props" class="ellipsis text-center" style="width: 100%">{{ item.raw.title }}</span>
            </template>
            <span>{{ item.raw.title }}</span>
          </VTooltip>
        </template>
        <template #item.dateRange1="{ item }">
          {{ formatStamp(Number(item.raw.dateRange1)) }}
        </template>
        <template #item.dateRange2="{ item }">
          {{ formatStamp(Number(item.raw.dateRange2)) }}
        </template>
        <template #item.type="{ item }">
          <span style="width: 100%; display: inline-block; text-align: center">{{ item.raw.type }}</span>
        </template>
        <template #item.createdAt="{ item }">
          <span style="width: 100%; display: inline-block; text-align: center">{{ formatStamp(item.raw.createdAt) }}</span>
        </template>
        <template #item.status="{ item }">
          <span style="width: 100%; display: inline-block; text-align: center">{{ item.raw.status }}</span>
        </template>
        <template #item.action="{ item }">
          <IconBtn @click="downloadFile(item.raw.fileLink, item.raw.title)">
            <VIcon icon="tabler-download" />
          </IconBtn>
        </template>
      </MyDataTable>
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
