<script setup>
import { useProjectStore } from "@app-insights360/views/dashboards/analytics/useProjectStore";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";
import debounce from "lodash/debounce";
import { toast } from "vue3-toastify";

const route = useRoute();
const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();

const props = defineProps({
  queue: { type: String, default: "" },
});

const tableData = ref([]);
const isLoading = ref(false);
const oldDates = ref([]);

const queueCode = computed(() => props.queue || route.params.queue || "");
const templateCode = computed(() => String(route.query.templateCode || ""));
const cta = computed(() => {
  const value = route.query.cta;
  return value == null || value === "" ? null : String(value);
});

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  filters: {
    lane: null,
    csid: null,
    template: null,
    buttonName: null,
    queue: null,
  },
});

const headers = [
  { title: "Channel", key: "lane", sortable: false },
  { title: "Contact", key: "csid", sortable: false },
  { title: "Template", key: "template", sortable: false },
  { title: "Button Name", key: "buttonName", sortable: false },
  { title: "Queue", key: "queue", sortable: false },
  { title: "Timestamp", key: "timestamp", sortable: false },
];

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

const tsToLabel = (s, e) => {
  const fmt = (d) => d.toLocaleDateString("en-GB").split("/").join("-");
  return `${fmt(new Date(s))} to ${fmt(new Date(e))}`;
};

const getInitialRange = () => {
  const qs = route.query.start ? Number(route.query.start) : null;
  const qe = route.query.end ? Number(route.query.end) : null;
  if (qs && qe) return { label: tsToLabel(qs, qe), start: qs, end: qe };
  return getDefaultWeekRange();
};

const initial = getInitialRange();
const dateRange = ref(initial.label);
const startTime = ref(initial.start);
const endTime = ref(initial.end);

const pageTitle = computed(() => {
  if (cta.value) return `${templateCode.value} · ${cta.value}`;
  return templateCode.value || "Contacts";
});

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

const formatStamp = (stamp) => {
  if (!stamp) return "-";
  const d = new Date(stamp);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const mapRows = (rows = []) =>
  rows.map((row) => ({
    ...row,
    lane: row.contact?.lane || "-",
    csid: row.contact?.csid || row.contact?.phone || row.contact?.mobile || "-",
    template: row.templateCode || "-",
    buttonName: row.buttonName || row.buttonCode || "-",
    queue: row.queue || queueCode.value,
    timestamp: row.timestamp,
  }));

const fetchContacts = async (start, end) => {
  if (!queueCode.value || !templateCode.value) return;
  isLoading.value = true;
  try {
    const response = await projectStore.fetchBotflowCtaDetails(start, end, {
      queue: queueCode.value,
      templateCode: templateCode.value,
      cta: cta.value,
      page: pagination.page,
      itemsPerPage: pagination.itemsPerPage,
      filters: pagination.filters,
    });
    const payload = response?.data || {};
    tableData.value = mapRows(payload.results || []);
    pagination.itemsLength = payload.pagination?.total ?? tableData.value.length;
    startTime.value = start;
    endTime.value = end;
  } catch (error) {
    console.error("botflow cta contacts error", error);
    tableData.value = [];
    pagination.itemsLength = 0;
  } finally {
    isLoading.value = false;
  }
};

const loadCurrentRange = () => {
  const { start, end } = parseRange();
  fetchContacts(start, end);
};

const onDateClosed = (selectedDates) => {
  if (selectedDates.length === 2 && toRaw(oldDates.value) != selectedDates) {
    oldDates.value = selectedDates;
    pagination.page = 1;
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDates[1]);
    endDate.setHours(23, 59, 59, 998);
    fetchContacts(start.getTime(), endDate.getTime());
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

const onUpdateOptionsDebounced = debounce((options) => {
  onUpdateOptions(options);
}, 300);

const refresh = () => {
  pagination.page = 1;
  loadCurrentRange();
};

const contactType = computed(() => {
  const first = tableData.value[0];
  return first?.contactType || first?.contact?.contactType || first?.lane || "";
});

const isDownloading = ref(false);

window.stillDownloadBotflowCta = async (val) => {
  toast.clearAll();
  await downloadReport(val);
};

const downloadReport = async (force = false) => {
  isDownloading.value = true;
  try {
    const meta = {
      queue: queueCode.value,
      templateCode: templateCode.value,
      ...(contactType.value ? { contactType: contactType.value } : {}),
      ...(cta.value ? { cta: cta.value } : {}),
    };
    const params = {
      type: "botflow-cta",
      start: startTime.value,
      end: endTime.value,
      meta,
      ...(force ? { force: true } : {}),
    };
    const response = await projectStore.downloadReports(params);
    if (response.data?.data?.status === "EXISTS") {
      const createdAt = response.data?.data?.doc?.createdAt;
      let formattedDateTime = "-";
      if (createdAt)
        formattedDateTime = new Date(createdAt).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true,
        });
      toast.info(
        `<div style="display:flex;flex-direction:column;gap:8px;">
          <div>Report created on ${formattedDateTime}. Available in Report Tab.</div>
          <div>Download fresh if more data was added after this report was generated.</div>
          <button style="border-radius:4px;border:1px solid #fff;width:240px;max-height:40px;padding-left:30px;
            display:flex;align-items:center;background:#1976d2;color:#fff;cursor:pointer;"
            onclick="window.stillDownloadBotflowCta(true)">Download Fresh</button>
        </div>`,
        { autoClose: false, dangerouslyHTMLString: true },
      );
    } else if (response.data?.data?.status === "IN_PROGRESS") {
      const createdAt = response.data?.data?.doc?.createdAt;
      let formattedDateTime = "-";
      if (createdAt)
        formattedDateTime = new Date(createdAt).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true,
        });
      toast.info(
        `<div style="display:flex;flex-direction:column;gap:8px;">
          <div>Report creation started on ${formattedDateTime}. Will appear in the Reports tab shortly.</div>
          <button style="border-radius:4px;border:1px solid #fff;width:240px;max-height:40px;padding-left:30px;
            display:flex;align-items:center;background:#1976d2;color:#fff;cursor:pointer;"
            onclick="window.stillDownloadBotflowCta(true)">Download Fresh</button>
        </div>`,
        { autoClose: false, dangerouslyHTMLString: true },
      );
    } else {
      toast.success("Download started. Please check after some time.");
    }
  } catch (error) {
    console.error("botflow-cta download error", error);
    toast.error("Failed to start download.");
  } finally {
    isDownloading.value = false;
  }
};
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
              :to="queueCode ? { name: 'views-botflow-queue', params: { queue: queueCode }, query: { start: startTime, end: endTime } } : { name: 'views-botflow' }"
            >
              <VIcon icon="tabler-arrow-left" />
            </VBtn>
            <h3 class="mb-0">{{ pageTitle }}</h3>
          </div>
          <p class="text-caption mb-0 ms-10">
            {{ cta ? "CTA contacts" : "Template contacts" }} · {{ queueCode }}
          </p>
        </div>
        <div class="d-flex align-center">
          <VTooltip text="Download report">
            <template #activator="{ props: tipProps }">
              <VBtn
                v-bind="tipProps"
                variant="flat"
                color="primary"
                class="pa-0"
                style="width:40px;height:40px;min-width:40px;"
                :loading="isDownloading"
                @click="downloadReport(false)"
              >
                <VIcon>mdi-file-download</VIcon>
              </VBtn>
            </template>
          </VTooltip>
          <AppDateTimePicker
            style="width: 250px; margin: 0 12px;"
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
                variant="flat"
                color="primary"
                class="pa-0"
                style="width:40px;height:40px;min-width:40px;"
                :loading="isLoading"
                @click="refresh"
              >
                <VIcon>mdi-refresh</VIcon>
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
        @update:options="onUpdateOptionsDebounced"
      >
        <template #item.timestamp="{ item }">
          {{ formatStamp(item.raw.timestamp) }}
        </template>
      </MyDataTable>
    </VCol>
  </VRow>
</template>
