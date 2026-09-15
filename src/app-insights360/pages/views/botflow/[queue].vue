<script setup>
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";

const route = useRoute();
const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();

const props = defineProps({
  queue: { type: String, default: "" },
});

const tableData = ref([]);
const isLoading = ref(false);
const oldDates = ref([]);
const queueName = ref("");
const queueCode = computed(() => props.queue || route.params.queue || "");

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    templateName: null,
    ctaName: null,
  },
});

const headers = [
  { title: "Template Name", key: "templateName", sortable: false },
  { title: "Sent", key: "sent", sortable: false },
  { title: "CTA Button", key: "ctaName", sortable: false },
  { title: "CTA Count", key: "ctaCount", sortable: false },
];

const today = new Date();
const tonight = new Date();
tonight.setHours(23, 59, 59, 998);

const getDefaultWeekRange = () => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 998);
  return {
    label: `${oneWeekAgo.toLocaleDateString("en-GB").split("/").join("-")} to ${end
      .toLocaleDateString("en-GB")
      .split("/")
      .join("-")}`,
    start: oneWeekAgo.getTime(),
    end: end.getTime(),
  };
};

const initial = getDefaultWeekRange();
const dateRange = ref(initial.label);
const startTime = ref(initial.start);
const endTime = ref(initial.end);

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

const flattenTemplateSummary = (templateSummary = {}) => {
  const rows = [];
  Object.entries(templateSummary).forEach(([templateCode, template]) => {
    const templateName = template?.name || templateCode || "-";
    const sent = template?.sent ?? 0;
    const ctaEntries = Object.entries(template?.cta || {});
    if (!ctaEntries.length) {
      rows.push({
        templateCode,
        templateName,
        sent,
        ctaName: "-",
        ctaCount: 0,
      });
      return;
    }
    ctaEntries.forEach(([ctaName, ctaCount]) => {
      rows.push({
        templateCode,
        templateName,
        sent,
        ctaName,
        ctaCount: ctaCount ?? 0,
      });
    });
  });
  return rows;
};

const contactsRoute = (row, includeCta = false) => ({
  name: "views-botflow-contacts",
  params: { queue: queueCode.value },
  query: {
    templateCode: row.templateCode,
    ...(includeCta && row.ctaName && row.ctaName !== "-"
      ? { cta: row.ctaName }
      : {}),
  },
});

const filteredTableData = computed(() => {
  const filters = pagination.filters || {};
  return tableData.value.filter((row) => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === null || value === undefined || value === "") return true;
      return String(row[key] ?? "")
        .toLowerCase()
        .includes(String(value).toLowerCase());
    });
  });
});

watch(filteredTableData, (rows) => {
  pagination.itemsLength = rows.length;
}, { immediate: true });

const fetchTemplateSummary = async (start, end) => {
  if (!queueCode.value) return;
  isLoading.value = true;
  try {
    const response = await projectStore.fetchBotflowTemplateSummary(
      start,
      end,
      queueCode.value,
    );
    const payload = response?.data?.data || response?.data || {};
    queueName.value = payload.queueName || queueCode.value;
    tableData.value = flattenTemplateSummary(payload.templateSummary || {});
    startTime.value = start;
    endTime.value = end;
  } catch (error) {
    console.error("botflow template summary error", error);
    tableData.value = [];
    pagination.itemsLength = 0;
  } finally {
    isLoading.value = false;
  }
};

const loadCurrentRange = () => {
  const { start, end } = parseRange();
  fetchTemplateSummary(start, end);
};

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 2 && toRaw(oldDates.value) != selectedDates) {
    oldDates.value = selectedDates;
    pagination.page = 1;
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDates[1]);
    endDate.setHours(23, 59, 59, 998);
    fetchTemplateSummary(start.getTime(), endDate.getTime());
  }
};

const onUpdateOptions = (options) => {
  const nextFilters = options.filters || pagination.filters;
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy || [];
  pagination.filters = nextFilters;
};

const refresh = () => {
  pagination.page = 1;
  loadCurrentRange();
};

onMounted(loadCurrentRange);
</script>

<template>
  <VRow>
    <VCol cols="12">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div class="mt-1 ml-3">
          <div class="d-flex align-center gap-2 mb-1">
            <VBtn
              icon
              variant="text"
              size="small"
              :to="{ name: 'views-botflow' }"
            >
              <VIcon icon="tabler-arrow-left" />
            </VBtn>
            <h3 class="mb-0">{{ queueName || queueCode }}</h3>
          </div>
          <p class="text-caption mb-0 ms-10">Template CTA Summary</p>
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
            <template #activator="{ props: tipProps }">
              <VBtn
                v-bind="tipProps"
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
        :items="filteredTableData"
        :loading="isLoading"
        v-bind="pagination"
        @update:options="onUpdateOptions"
      >
        <template #item.sent="{ item }">
          <RouterLink
            :to="contactsRoute(item.raw, false)"
            class="text-primary text-decoration-underline"
          >
            {{ item.raw.sent }}
          </RouterLink>
        </template>
        <template #item.ctaCount="{ item }">
          <RouterLink
            v-if="item.raw.ctaName && item.raw.ctaName !== '-'"
            :to="contactsRoute(item.raw, true)"
            class="text-primary text-decoration-underline"
          >
            {{ item.raw.ctaCount }}
          </RouterLink>
          <span v-else>{{ item.raw.ctaCount }}</span>
        </template>
      </MyDataTable>
    </VCol>
  </VRow>
</template>
