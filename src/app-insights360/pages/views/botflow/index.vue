<script setup>
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();

const tableData = ref([]);
const isLoading = ref(false);
const oldDates = ref([]);
const startTime = ref();
const endTime = ref();

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    queueName: null,
    queue: null,
  },
});

const headers = [
  { title: "Queue Name", key: "queueName", sortable: false },
  { title: "Queue", key: "queue", sortable: false },
  { title: "Session/Total", key: "session", sortable: false },
  { title: "Sent", key: "sent", sortable: false },
  { title: "Delivered", key: "delivered", sortable: false },
  { title: "Read", key: "read", sortable: false },
  { title: "Responded", key: "responded", sortable: false },
];

const today = new Date();
const tonight = new Date();
tonight.setHours(23, 59, 59, 998);
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
const formattedStart = oneWeekAgo.toLocaleDateString("en-GB").split("/").join("-");
const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-");
const dateRange = ref(`${formattedStart} to ${formattedEnd}`);

const parseRange = () => {
  const raw = String(dateRange.value || "");
  const startStr = raw.slice(0, 10);
  const endStr = raw.includes(" to ") ? raw.slice(-10) : startStr;
  const [startDay, startMonth, startYear] = startStr.split("-");
  const [endDay, endMonth, endYear] = endStr.split("-");
  const start = new Date(`${startMonth}-${startDay}-${startYear}`);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 998);
  return { start: start.getTime(), end: end.getTime() };
};

const mapRows = (rows = []) =>
  rows.map((row) => {
    const stats = row.stats || {};
    return {
      ...row,
      session: stats.session ?? 0,
      sent: stats.SENT ?? stats.SEND ?? 0,
      delivered: stats.DLVRD ?? 0,
      read: stats.READ ?? 0,
      responded: stats.RSPND ?? 0,
    };
  });

const fetchBotflowSummary = async (start, end) => {
  isLoading.value = true;
  try {
    const response = await projectStore.fetchBotflowSummary(start, end, pagination);
    const payload = response?.data || {};
    tableData.value = mapRows(payload.data || payload.results || []);
    pagination.itemsLength = payload.pagination?.total ?? tableData.value.length;
    startTime.value = start;
    endTime.value = end;
  } catch (error) {
    console.error("botflow summary error", error);
    tableData.value = [];
    pagination.itemsLength = 0;
  } finally {
    isLoading.value = false;
  }
};

const loadCurrentRange = () => {
  const { start, end } = parseRange();
  fetchBotflowSummary(start, end);
};

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 2 && toRaw(oldDates.value) != selectedDates) {
    oldDates.value = selectedDates;
    pagination.page = 1;
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDates[1]);
    endDate.setHours(23, 59, 59, 998);
    fetchBotflowSummary(start.getTime(), endDate.getTime());
  }
};

const onUpdateOptions = (options) => {
  const nextFilters = options.filters || pagination.filters;
  const filtersChanged = JSON.stringify(nextFilters) !== JSON.stringify(pagination.filters);
  pagination.page = filtersChanged ? 1 : options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy || [];
  pagination.filters = nextFilters;
  loadCurrentRange();
};

const refresh = () => {
  pagination.page = 1;
  loadCurrentRange();
};
</script>

<template>
  <VRow>
    <VCol cols="12">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div class="mt-1 ml-3">
          <h3 class="mb-1">Botflow Summary</h3>
        </div>
        <div class="d-flex align-center">
          <AppDateTimePicker
            style="width: 250px"
            v-model="dateRange"
            prepend-inner-icon="tabler-calendar"
            :config="{
              mode: 'range',
              dateFormat: 'd-m-Y',
              position: 'auto right',
              maxDate: tonight,
              onClose: onDateClosed,
              plugins: [customPlugin],
            }"
          />
          <VTooltip text="Refresh">
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                icon
                variant="text"
                color="primary"
                class="ms-1"
                :loading="isLoading"
                @click="refresh"
              >
                <VIcon icon="tabler-refresh" />
              </VBtn>
            </template>
          </VTooltip>
        </div>
      </div>
    </VCol>

    <VCol cols="12">
      <MyDataTable
        :headers="headers"
        :items="tableData"
        :loading="isLoading"
        :server-side="true"
        v-bind="pagination"
        @update:options="onUpdateOptions"
      >
        <template #item.queueName="{ item }">
          <RouterLink
            :to="{
              name: 'views-botflow-queue',
              params: { queue: item.raw.queue },
            }"
            class="text-primary text-decoration-underline"
          >
            {{ item.raw.queueName }}
          </RouterLink>
        </template>
      </MyDataTable>
    </VCol>
  </VRow>
</template>
