<script setup>
import debounce from "lodash/debounce";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
import CardStatisticsTransactions from '@/app-pushapp/views/dashboards/event/CardStatisticsTransactions.vue'
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import AbTestingMetrics from "@/app-pushapp/views/admin/app-engagements/AbTestingMetrics.vue";
import FilterViewer from "@/app-pushapp/views/admin/app-engagements/FilterViewer.vue";
import AppDateTimePicker from "@/app-pushapp/@core/components/app-form-elements/AppDateTimePicker.vue";
import { useDatePickerFilters } from "@app-tikat/views/dashboard/analytics/useDatePickerFilters";
import * as XLSX from "xlsx";

const isExporting = ref(false);
const { show } = inject("snackbar");

const { TYPES, SUB_TYPES } = useAppEngagements();
const appEngagementsStore = useAppEngagementsStore();
const TYPES2 = TYPES.map((c) => c.value);
const isLoading = ref(false);
const items = ref([]);

const statsTotal = ref([
  { title: "Total Count", stats: "0", icon: "tabler-send", color: "primary" }
]);

const statsRest = ref([
  { title: "Delivered", stats: "0", icon: "tabler-check", color: "success" },
  { title: "Delivery %", stats: "0%", icon: "tabler-chart-pie", color: "success" },
  { title: "CTA", stats: "0", icon: "tabler-click", color: "warning" },
  { title: "CTA %", stats: "0%", icon: "tabler-chart-pie", color: "warning" },
]);

const fetchStats = async () => {
  try {
    const payload = {
      dateRange1: pagination.dateRange1,
      dateRange2: pagination.dateRange2,
      timezone: pagination.timezone
    };
    
    const response = await appEngagementsStore.fetchEngagementCampaignStats(payload);
    const data = response.data.stats || { total: 0, sent: 0, ctaCount: 0 };
    
    const sentPct = data.total > 0 ? Math.round((data.sent / data.total) * 100) : 0;
    const ctaPct = data.sent > 0 ? Math.round((data.ctaCount / data.sent) * 100) : 0;

    statsTotal.value[0].stats = String(data.total);
    
    statsRest.value[0].stats = String(data.sent);
    statsRest.value[1].stats = `${sentPct}%`;
    statsRest.value[2].stats = String(data.ctaCount);
    statsRest.value[3].stats = `${ctaPct}%`;
  } catch (error) {
    console.error("Failed to fetch app engagement stats", error);
  }
};

const formattedItems = computed(() =>
  items.value.map((item) => ({
    ...item,
    stats: {
      ...item.stats,
      sent_percent:
        item.stats?.total > 0
          ? Math.round((item.stats.sent / item.stats.total) * 100)
          : 0,
      cta_percent:
        item.stats?.sent > 0
          ? Math.round(((item.stats.cta?.__count || 0) / item.stats.sent) * 100)
          : 0,
    },
    status:
      getCampaignStatus(item.schedule, item.abTesting?.enabled, item.status),
  })),
);
const headers = [
  { title: "", key: "data-table-expand" },
  {
    title: "Name",
    key: "title",
  },
  {
    title: "Template",
    key: "action.template.code",
  },
  // {
  //   title: "Type",
  //   key: "action.template.type",
  //   filterType: "select",
  //   filterOptions: TYPES2,
  // },
  {
    title: "Type",
    key: "action.template.subType",
    filterType: "select",
    filterOptions: SUB_TYPES,
  },
  {
    title: "A/B",
    key: "abTesting.enabled",
    filterType: "switch",
    // filterOptions: [
    //   { title: "Enabled", value: true },
    //   { title: "Disabled", value: false },
    // ],
  },
  // {
  //   title: "Window ",
  //   key: "schedule.enableActiveWindow",
  //   filterType: "switch",
  // },
  {
    title: "Status",
    key: "status",
    filterType: "select",
    filterOptions: [
      { title: "Created", value: "CREATED" },
      { title: "Testing", value: "TESTING" },
      { title: "Awaiting Result", value: "AWAITING_RESULT" },
      { title: "Aborted", value: "ABORTED" },
      { title: "On-going", value: "ON_GOING" },
      { title: "Ended", value: "ENDED" },
    ],
  },
  {
    title: "Time",
    key: "created.stamp",
    sortable: false,
    align: "center",
  },
  {
    title: "Created by",
    key: "created.byUser",
    sortable: false,
    align: "center",
  },
  {
    title: "Count",
    key: "stats.total",
    sortable: false,
    align: "center",
  },
  {
    title: "Delivered",
    key: "stats.sent",
    sortable: false,
    align: "center",
  },
  {
    title: "Delivery %",
    key: "stats.sent_percent",
    sortable: false,
    align: "center",
  },
  {
    title: "CTA",
    key: "stats.cta.__count",
    sortable: false,
    align: "center",
  },
  {
    title: "CTA %",
    key: "stats.cta_percent",
    sortable: false,
    align: "center",
  },
  // {
  //   title: "View time (sec)",
  //   key: "stats.viewTime",
  // },
  // {
  //   title: "Avg time / view",
  //   key: "stats.avgTimePerView",
  // },
  // {
  //   title: "Avg time / User",
  //   key: "stats.avgTimePerUser",
  // },
  {
    title: "",
    key: "actions",
    sortable: false,
  },
];

const { customPlugin } = useDatePickerFilters();

const tonight = new Date().setHours(23, 59, 59, 999);
const formatDate = (dat) => dat.toLocaleDateString("en-GB").split("/").join("-");
const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 6));
const dateRange = ref(`${formatDate(sevenDaysAgo)} to ${formatDate(new Date())}`);

const timezone = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asia/Kolkata";

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    title: null,
    "action.template.code": null,
    // "action.template.type": null,
    "action.template.subType": null,
    "abTesting.enabled": false,
    // "schedule.enableActiveWindow": null,
    status: null,
  },
  dateRange1: new Date(sevenDaysAgo).setHours(0, 0, 0, 0),
  dateRange2: new Date().setHours(23, 59, 59, 999),
  timezone: timezone
});

const onDateClosed = (selectedDates, dateStr) => {
  if (selectedDates.length === 2) {
    dateRange.value = dateStr;
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDates[1]);
    end.setHours(23, 59, 59, 999);
    pagination.dateRange1 = start.getTime();
    pagination.dateRange2 = end.getTime();
    fetchCampaigns({ ...pagination });
    fetchStats();
  }
};

onMounted(async () => {
  fetchStats();
});

const logDialog = ref(false);
const selectedLogs = ref([]);
const openLogDialog = (logs) => {
  selectedLogs.value = logs || [];
  logDialog.value = true;
};

const getCampaignStatus = (
  { durationType, startDate, endDate },
  isAbTesting, status
) => {
  if(status === 'ENDED' || status === 'AWAITING_RESULT' || status === 'ABORTED') return status;
  if (durationType === "ALWAYS" || durationType === "manual") {
    if (isAbTesting) return "TESTING";
    return "ON_GOING";
  }

  if (durationType === "DATE_RANGE" || durationType === "specific") {
    const now = Date.now();

    if (now < startDate) {
      return "CREATED";
    }
    if (now >= startDate && now <= endDate) {
      if (isAbTesting) return "TESTING";
      return "ON_GOING";
    }
    return "ENDED";
  }

  return "CREATED";
};

const fetchCampaigns = async (params) => {
  try {
    isLoading.value = true;

    const response = await appEngagementsStore.fetchFilters(params);
    items.value = response.data.results.map((r) => ({
      ...r,
      id: r._id,
    }));
    pagination.itemsLength = response.data.pagination.total;
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const endCampaign = async (item, dialogCloseRef) => {
  try {
    isLoading.value = true;

    await appEngagementsStore.updateFilter({
      id: item._id,
      status: "ENDED",
    });
    fetchCampaigns({ ...pagination });
    dialogCloseRef.value = false;
    show({ message: "Campaign ended successfully", color: "success" });
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};
const endedStamp = history => {
  return history?.find(h => h.status === "ENDED")?.time?.stamp
}
const formatDate2 = stamp => {
  if (!stamp) return "-"
  return new Date(stamp).toLocaleString()
}
function formatFieldName(field) {
  if (field === null || field === undefined) return "";
  const str = String(field);
  const withSpaces = str.replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}
const getReadableRecurrence = (schedule) => {
  if (!schedule) return "N/A";

  const { rrule, activeHours, timezone } = schedule;
  let text = "";
  if (rrule?.includes("FREQ=DAILY")) text = "Runs Daily";
  else if (rrule?.includes("FREQ=WEEKLY")) {
    const days = rrule.match(/BYDAY=([^;]+)/)?.[1]?.split(",")?.join(", ") || "";
    text = `Runs Weekly on ${days}`;
  }
  else if (rrule?.includes("FREQ=MONTHLY")) {
    if (rrule.includes("BYMONTHDAY")) {
      const day = rrule.match(/BYMONTHDAY=([^;]+)/)?.[1];
      text = `Runs Monthly on Day ${day}`;
    }
    else if (rrule.includes("BYSETPOS")) {
      const pos = rrule.match(/BYSETPOS=([^;]+)/)?.[1];
      const days = rrule.match(/BYDAY=([^;]+)/)?.[1]?.split(",")?.join(", ") || "";
      const map = { 1: "First", 2: "Second", 3: "Third", 4: "Fourth", "-1": "Last",};
      text = `Runs Monthly on ${map[pos]} ${days}`;
    }
  }

  if (activeHours?.start && activeHours?.end) text += ` between ${activeHours.start} - ${activeHours.end}`;
  return text || "N/A";
};

const onUpdateOptions = (options) => {
  pagination.itemsLength = options.itemsLength;
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;

  fetchCampaigns({ ...pagination });
};

const exportToExcel = async () => {
  try {
    isExporting.value = true;
    const response = await appEngagementsStore.fetchFilters({
      ...pagination,
      page: -1,
    });

    const rawResults = response.data.results || [];
    const formattedData = rawResults.map((item) => {
      const total = item.stats?.total || 0;
      const sent = item.stats?.sent || 0;
      const ctaCount = item.stats?.cta?.__count || 0;
      const sentPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
      const ctaPercent = sent > 0 ? Math.round((ctaCount / sent) * 100) : 0;

      const baseRow = {
        "Name": item.title,
        "Template": item.action?.template?.code,
        "Type": item.action?.template?.type,
        "SubType": item.action?.template?.subType,
        "A/B Testing": item.abTesting?.enabled ? "Yes" : "No",
        "Status": item.status,
        "Count": total,
        "Delivered": sent,
        "Delivery %": `${sentPercent}%`,
        "Total CTA": ctaCount,
        "CTA %": `${ctaPercent}%`,
      };

      const dynamicCTAs = {};
      if (item.stats?.cta) {
        Object.entries(item.stats.cta).forEach(([key, val]) => {
          if (key !== "__count") dynamicCTAs[`CTA - ${key}`] = val;
        });
      }

      return { ...baseRow, ...dynamicCTAs };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "App Engagements");
    const fileName = `AppEngagements-data-${dateRange.value}.xlsx`.replaceAll(" ", "-");
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error("Export failed", error);
  } finally {
    isExporting.value = false;
  }
};

const onUpdateOptionsDebounced = debounce((options) => {
  onUpdateOptions(options);
}, 300);
</script>

<template>
  <VRow id="invoice-list">
    <div style="width: 100%; display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-bottom: 16px; padding: 0 12px;">
      
      <VTooltip text="Refresh Data">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            icon
            @click="() => { fetchCampaigns({ ...pagination }); fetchStats(); }"
            :loading="isLoading"
            variant="text"
          >
            <VIcon>tabler-refresh</VIcon>
          </VBtn>
        </template>
      </VTooltip>

      <VTooltip text="Export to Excel">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            @click="exportToExcel"
            color="primary"
            style="width: 45px; height: 45px; min-width: 40px"
            class="pa-0"
            variant="flat"
            :loading="isExporting"
          >
            <VIcon>mdi-download</VIcon>
          </VBtn>
        </template>
      </VTooltip>

      <AppDateTimePicker
        style="width: 250px; margin-left: auto;"
        v-model="dateRange"
        prepend-inner-icon="tabler-calendar"
        :config="{ 
          mode: 'range', 
          dateFormat: 'd-m-Y', 
          maxDate: tonight, 
          onClose: onDateClosed,
          plugins: [customPlugin] 
        }"
      />

      <VBtn
        prepend-icon="tabler-plus"
        :to="{ name: 'admin-app-engagements-campaigns-add' }"
        style="height: 45px;"
      >
        New Campaign
      </VBtn>
    </div>

    <VCol cols="12" md="3">
      <CardStatisticsTransactions
        :statistics="statsTotal"
        title="Count"
      />
    </VCol>
    <VCol cols="12" md="9">
      <CardStatisticsTransactions
        :statistics="statsRest"
        title="Stats"
      />
    </VCol>

    <VCol cols="12">
      <MyDataTable
        :headers="headers"
        :items="formattedItems"
        :loading="isLoading"
        :server-side="true"
        v-bind="pagination"
        @update:options="onUpdateOptionsDebounced"
      >
      <!-- Expanded Row Data [ show-expand ] -->
      <template #expanded-row="slotProps">
        <tr class="v-data-table__tr">
          <!-- <td :colspan="headers.length"> -->
          <td :colspan="6">
            <AbTestingMetrics
              :abTesting="slotProps.item.raw.abTesting"
              :stats="slotProps.item.raw.stats"
            />
          </td>
        </tr>
      </template>

      <!-- status -->
      <template #item.status="{ item }">
        <VChip
          :color="
            {
              CREATED: 'primary',
              TESTING: 'info',
              AWAITING_RESULT: 'info',
              ABORTED: 'error',
              ON_GOING: 'success',
              ENDED: 'error',
            }[item.raw.status]
          "
          variant="tonal"
          size="small"
          class="text-capitalize"
        >
          {{ item.raw.status.replace("_", " ") }}
        </VChip>
      </template>

      <!-- A/B enabled -->
      <template #item.abTesting.enabled="{ item }">
        <VIcon
          v-if="item.raw.abTesting?.enabled"
          size="16"
          :color="
            {
              CREATED: 'info',
              TESTING: 'info',
              AWAITING_RESULT: 'info',
              CONCLUDED: 'success',
              ABORTED: 'error',
            }[item.raw.abTesting?.state]
          "
          start
        >
          mdi-flask
        </VIcon>
        <VTooltip v-if="item.raw.abTesting?.enabled" activator="parent">{{
          item.raw.abTesting?.state || "Expand row for more details"
        }}</VTooltip>
      </template>

      <!-- backend filtering not supported -->
      <!-- <template #item.schedule.enableActiveWindow="{ item }">
        <div class="d-flex justify-center">
          <VIcon v-if="item.raw.schedule?.enableActiveWindow" size="16" color="success">
            mdi-clock-outline
          </VIcon>
        </div>
      </template> -->

      <!-- Template codes -->
      <template #item.action.template.code="{ item }">
        {{ item.raw.action.template.code }}
        {{
          item.raw.action.templateB?.code
            ? "| " + item.raw.action.templateB?.code
            : ""
        }}
      </template>

      <!-- Template types -->
      <!-- <template #item.action.template.type="{ item }">
        {{ item.raw.action.template.type }}
        {{
          item.raw.action.templateB?.type
            ? "| " + item.raw.action.templateB?.type
            : ""
        }}
      </template> -->
      <template #item.created.stamp="{ item }">
        <IconBtn>
          <VIcon icon="tabler-clock-filled" size="16" class="me-1" />
          <VTooltip activator="parent" open-delay="1000" scroll-strategy="close">
            <div class="py-1">
              <div v-if="item.raw.created && item.raw.created.stamp">
                <strong>Created:</strong> {{ formatDate2(item.raw.created.stamp) }}
              </div>
              <div v-if="item.raw.schedule && item.raw.schedule.startDate">
                <strong>Scheduled:</strong> {{ formatDate2(item.raw.schedule.startDate) }}
              </div>
              <div v-if="endedStamp(item.raw.statusHistory)">
                <strong>Ended:</strong> {{ formatDate2(endedStamp(item.raw.statusHistory)) }}
              </div>
            </div>
          </VTooltip>
        </IconBtn>
      </template>

      <!-- Template sub types -->
      <template #item.action.template.subType="{ item }">
        {{ item.raw.action.template.subType }}
        {{
          item.raw.action.templateB?.subType
            ? "| " + item.raw.action.templateB?.subType
            : ""
        }}
      </template>

      <template #item.created.byUser="{ item }">
        <span v-if="item.raw.created && item.raw.created.byUser">{{ item.raw.created.byUser }}</span>
        <span v-else> - </span>
      </template>

      <!-- sent_percent -->
      <template #item.stats.sent_percent="{ item }">
        <div class="d-flex align-center">
          <VProgressLinear
            :model-value="item.raw.stats.sent_percent"
            height="6"
            color="primary"
            class="flex-grow-1 mr-2"
            rounded
            style="min-width: 60px"
          />
          <VChip size="x-small" variant="flat" color="primary">
            {{ item.raw.stats.sent_percent }}%
          </VChip>
        </div>
      </template>

      <!-- cta_percent -->
      <template #item.stats.cta_percent="{ item }">
        <div class="d-flex align-center">
          <VProgressLinear
            :model-value="item.raw.stats.cta_percent"
            height="6"
            color="primary"
            class="flex-grow-1 mr-2"
            rounded
            style="min-width: 60px"
          />
          <VChip size="x-small" variant="flat" color="primary">
            {{ item.raw.stats.cta_percent }}%
          </VChip>
        </div>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <VBtn
          v-if="item.raw.status !== 'ENDED' && item.raw.status !== 'ABORTED'"
          variant="outlined"
          color="error"
          size="small"
        >
          <VIcon icon="mdi-stop" start />
          End

          <v-dialog activator="parent" max-width="340">
            <template v-slot:default="{ isActive }">
              <v-card
                class=""
                prepend-icon="mdi-alert"
                text="Are you certain, you want to end this campaign ?"
                title="Confirm"
              >
                <template v-slot:actions>
                  <v-btn
                    class="ml-auto"
                    text="Yes"
                    @click="endCampaign(item.raw, isActive)"
                  ></v-btn>
                  <v-btn
                    class="ml-auto"
                    text="No"
                    @click="isActive.value = false"
                  ></v-btn>
                </template>
              </v-card>
            </template>
          </v-dialog>

          <VTooltip activator="parent">End this campaign</VTooltip>
        </VBtn>
        <IconBtn
          :to="{
            name: 'admin-app-engagements-campaigns-view-id?',
            params: { id: item.raw._id },
          }"
        >
          <VIcon>mdi-eye</VIcon>
          <VTooltip activator="parent">View Campaign Details</VTooltip>
        </IconBtn>
        <!-- <IconBtn @click="openLogDialog(item)">
          <VIcon>mdi-eye</VIcon>
          <VTooltip activator="parent">Logs</VTooltip>
        </IconBtn> -->
      </template>
    </MyDataTable>
  </VCol>
    <!-- <VDialog v-model="logDialog" max-width="600">
      <VCard>
        <VCardTitle class="text-h6">Campaign Details</VCardTitle>
        <VCardText>
          <div class="campaign-details">
            <div><strong>Campaign ID:</strong> {{ selectedLogs.raw._id }}</div>

            <section class="detail-block">
              <h5>Audience</h5>
              <div>
                <div>
                  <strong>User Set:</strong>
                  {{ selectedLogs.raw.audience?.userSet }}
                </div>
              </div>
            </section>

            <section v-if="selectedLogs.raw.filter" class="detail-block">
              <h5>Filter</h5>
              <FilterViewer :node="selectedLogs.raw.filter" />
            </section>

            <section v-if="selectedLogs.raw.schedule" class="detail-block">
              <h5>Schedule</h5>
              <div>
                <strong>Duration Type:</strong>
                {{ formatFieldName(selectedLogs.raw.schedule.type) || formatFieldName(selectedLogs.raw.schedule.durationType) }}
              </div>

              <template v-if="selectedLogs.raw.schedule.durationType === 'DATE_RANGE' || selectedLogs.raw.schedule.durationType === 'specific'">
                <div>
                  <strong>Start Date:</strong>
                  {{ formatDate(selectedLogs.raw.schedule.dateRange?.start || selectedLogs.raw.schedule.startDate) }}
                </div>
                <div>
                  <strong>End Date:</strong>
                  {{ formatDate(selectedLogs.raw.schedule.dateRange?.end || selectedLogs.raw.schedule.endDate) }}
                </div>
              </template>

              <template v-if="selectedLogs.raw.schedule.enableActiveWindow">
                <VDivider class="my-3" />
                <VChip size="medium" color="primary" variant="tonal" style="padding: 5px 10px;">
                  {{ getReadableRecurrence(selectedLogs.raw.schedule) }}
                </VChip>
              </template>
            </section>
          </div>
        </VCardText>
        <VCardActions class="sticky-footer">
          <VSpacer />
          <VBtn text @click="logDialog = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog> -->
  <!-- </VCard> -->
   </VRow>
</template>

<style lang="scss">
#invoice-list {
  .invoice-list-actions {
    inline-size: 8rem;
  }

  .invoice-list-filter {
    inline-size: 12rem;
  }
}
.my-data-table {
  .v-table__wrapper {
    min-height: 100px;
  }
}
.campaign-details {
  font-size: 14px;
  line-height: 1.6;
}
.detail-row {
  display: block;
  flex-wrap: wrap; /* allows wrapping if not enough space */
  gap: 0px; /* spacing between blocks */
  margin: 12px 0px;
  // max-width: calc(100vw - 100px);
}

.detail-block {
  // flex: 0 0 auto; /* fit to content width */
  padding: 5px 20px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  width: 100%;
  margin-top: 10px;
}
.detail-block h5 {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 0.5px solid grey;
  text-align: center;
  padding-bottom: 4px;
}
</style>
