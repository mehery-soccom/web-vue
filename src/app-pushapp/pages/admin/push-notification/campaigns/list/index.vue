<script setup>
import { PLATFORM_COLORS } from "@app-pushapp/utils/constants";
// import NotificationQuickAnalytics from "@app-pushapp/views/admin/push-notification/NotificationQuickAnalytics.vue";
import CardStatisticsTransactions from "@/app-pushapp/views/dashboards/event/CardStatisticsTransactions.vue";
import NotificationCampaignExpansion from "@/app-pushapp/views/admin/push-notification/NotificationCampaignExpansion.vue";
import AppDateTimePicker from "@/app-pushapp/@core/components/app-form-elements/AppDateTimePicker.vue";
import { useDatePickerFilters } from "@app-tikat/views/dashboard/analytics/useDatePickerFilters";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
import FilterViewer from "@/app-pushapp/views/admin/app-engagements/FilterViewer.vue";
import debounce from "lodash/debounce";
import * as XLSX from "xlsx";

const isExporting = ref(false);
const pushNotificationStore = usePushNotificationStore();
const isLoading = ref(false);
const notifications = ref([]);
const formattedNotifications = computed(() =>
  notifications.value.map((item) => ({
    ...item,
    stats: {
      ...item.stats,
      cta: {
        __count: 0,
        ...item.stats.cta,
      },
      sent_percent:
        item.messageCount > 0
          ? Math.round((item.stats.sent / item.messageCount) * 100)
          : 0,
      opened_percent:
        item.stats?.sent > 0
          ? Math.round((item.stats.opened / item.stats.sent) * 100)
          : 0,
      cta_percent:
        item.stats?.sent > 0
          ? Math.round(((item.stats.cta?.__count || 0) / item.stats.sent) * 100)
          : 0,
    },
    status:
      item.status === "DERIVE" ? getCampaignStatus(item.schedule) : item.status,
  })),
);

const statsTotal = ref([
  { title: "Total", stats: "0", icon: "tabler-send", color: "primary" },
]);

const statsRest = ref([
  { title: "Sent", stats: "0", icon: "tabler-check", color: "success" },
  { title: "Sent %", stats: "0%", icon: "tabler-chart-pie", color: "success" },
  { title: "Opened", stats: "0", icon: "tabler-mail-opened", color: "info" },
  { title: "Opened %", stats: "0%", icon: "tabler-chart-pie", color: "info" },
  { title: "CTA", stats: "0", icon: "tabler-click", color: "warning" },
  { title: "CTA %", stats: "0%", icon: "tabler-chart-pie", color: "warning" },
]);

const formatStatNumber = (num) => {
  if (num >= 1000000) {
    return parseFloat((num / 1000000).toFixed(3)) + "M";
  } else if (num >= 10000) {
    return parseFloat((num / 1000).toFixed(2)) + "K";
  }
  return String(num);
};

const fetchStats = async () => {
  try {
    const payload = {
      dateRange1: pagination.dateRange1,
      dateRange2: pagination.dateRange2,
      timezone: pagination.timezone,
    };

    const response = await pushNotificationStore.fetchCampaignStats(payload);
    const data = response.data.stats || {
      total: 0,
      sent: 0,
      opened: 0,
      failed: 0,
      cta: 0,
    };

    const sentPct =
      data.total > 0 ? Math.round((data.sent / data.total) * 100) : 0;
    const openPct =
      data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0;
    const ctaPct = data.sent > 0 ? Math.round((data.cta / data.sent) * 100) : 0;

    statsTotal.value[0].stats = formatStatNumber(data.total);

    statsRest.value[0].stats = formatStatNumber(data.sent);
    statsRest.value[1].stats = `${sentPct}%`;
    statsRest.value[2].stats = formatStatNumber(data.opened);
    statsRest.value[3].stats = `${openPct}%`;
    statsRest.value[4].stats = formatStatNumber(data.cta);
    statsRest.value[5].stats = `${ctaPct}%`;
  } catch (error) {
    console.error("Failed to fetch campaign stats", error);
  }
};

const headers = [
  { title: "", key: "data-table-expand" },
  {
    title: "Name",
    key: "campaignName",
  },
  {
    title: "Template",
    key: "templateCode",
  },
  {
    title: "Status",
    key: "status",
    align: "center",
    filterType: "select",
    filterOptions: [
      { title: "Completed", value: "COMPLETED" },
      { title: "Created", value: "CREATED" },
      { title: "Ended", value: "ENDED" },
      { title: "Failed", value: "FAILED" },
      { title: "On-going", value: "ON_GOING" },
      { title: "Scheduled", value: "SCHEDULED" },
    ],
  },
  {
    title: "Time",
    key: "created.stamp",
    align: "center",
  },
  {
    title: "Created by",
    key: "createdBy",
    sortable: false,
    align: "center",
  },
  {
    title: "Total",
    key: "messageCount",
    sortable: false,
    align: "center",
  },
  // {
  //   title: "Recurring",
  //   key: "schedule.isRecurring",
  //   filterType: "switch",
  // },
  {
    title: "Sent",
    key: "stats.sent",
    sortable: false,
    align: "center",
  },
  {
    title: "Sent %",
    key: "stats.sent_percent",
    sortable: false,
    align: "center",
  },
  {
    title: "Opened",
    key: "stats.opened",
    sortable: false,
    align: "center",
  },
  {
    title: "Opened %",
    key: "stats.opened_percent",
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
  {
    title: "Actions",
    key: "actions",
    sortable: false,
    align: "center",
  },
];

const { customPlugin } = useDatePickerFilters();

const tonight = new Date().setHours(23, 59, 59, 999);
const formatDate = (date) =>
  date.toLocaleDateString("en-GB").split("/").join("-");
const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 1));
const dateRange = ref(
  `${formatDate(sevenDaysAgo)} to ${formatDate(new Date())}`,
);

const timezone =
  window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] ||
  "Asia/Kolkata";

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    campaignName: "",
    templateCode: "",
    status: "",
  },
  dateRange1: new Date(sevenDaysAgo).setHours(0, 0, 0, 0),
  dateRange2: new Date().setHours(23, 59, 59, 999),
  timezone: timezone,
});

const onDateClosed = (selectedDates, dateStr) => {
  if (selectedDates.length === 2) {
    dateRange.value = dateStr;

    // Convert to epoch milliseconds
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDates[1]);
    end.setHours(23, 59, 59, 999);

    pagination.dateRange1 = start.getTime();
    pagination.dateRange2 = end.getTime();

    fetchStats();
  }
};

const now = new Date();
const logDialog = ref(false);
const selectedLogs = ref([]);
const selectedErrorLogs = ref([]);
const formatDate2 = (stamp) => {
  if (!stamp) return "-";
  return new Date(stamp).toLocaleString();
};
function formatFieldName(field) {
  if (field === null || field === undefined) return "";
  const str = String(field);
  const withSpaces = str.replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}
const getReadableRecurrence = (schedule) => {
  if (!schedule) return "N/A";

  const { rrule } = schedule;
  const hour = rrule.match(/BYHOUR=([^;]+)/)?.[1];
  const minute = rrule.match(/BYMINUTE=([^;]+)/)?.[1];
  const runTime =
    hour !== undefined && minute !== undefined
      ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      : null;
  let text = "";

  if (rrule?.includes("FREQ=DAILY")) text = "Runs Daily";
  else if (rrule?.includes("FREQ=WEEKLY")) {
    const days =
      rrule
        .match(/BYDAY=([^;]+)/)?.[1]
        ?.split(",")
        ?.join(", ") || "";
    text = `Runs Weekly on ${days}`;
  } else if (rrule?.includes("FREQ=MONTHLY")) {
    if (rrule.includes("BYMONTHDAY")) {
      const day = rrule.match(/BYMONTHDAY=([^;]+)/)?.[1];
      text = `Runs Monthly on Day ${day}`;
    } else if (rrule.includes("BYSETPOS")) {
      const pos = rrule.match(/BYSETPOS=([^;]+)/)?.[1];
      const days =
        rrule
          .match(/BYDAY=([^;]+)/)?.[1]
          ?.split(",")
          ?.join(", ") || "";
      const map = {
        1: "First",
        2: "Second",
        3: "Third",
        4: "Fourth",
        "-1": "Last",
      };
      text = `Runs Monthly on ${map[pos]} ${days}`;
    }
  }

  if (runTime) text += ` at ${runTime}`;
  return text || "N/A";
};

onMounted(async () => {
  fetchStats();
});

const fetchCampaigns = async (params) => {
  try {
    isLoading.value = true;

    const { dateRange1, dateRange2, ...campaignParams } = params;
    const response = await pushNotificationStore.fetchCampaigns(campaignParams);
    notifications.value = response.data.results.map((r) => ({
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

const cancelCampaigns = async (id) => {
  try {
    isLoading.value = true;
    const response = await pushNotificationStore.cancelCampaign(id);
    if (response.data) await fetchCampaigns({ ...pagination });
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};
const cancelDialog = ref(false);
const campaignToCancel = ref(null);
const openCancelDialog = (id) => {
  campaignToCancel.value = id;
  cancelDialog.value = true;
};
const confirmCancelCampaign = async () => {
  await cancelCampaigns(campaignToCancel.value);
  cancelDialog.value = false;
  campaignToCancel.value = null;
};

// const campaignDialog = ref(false);
// const selectedCampaignLogs = ref([]);
// const openCampaignDialog = (logs) => {
//   selectedCampaignLogs.value = logs || [];
//   campaignDialog.value = true;
// };
const openLogDialog = (logs, errorLogs) => {
  selectedLogs.value = logs || [];
  selectedErrorLogs.value = errorLogs || [];
  logDialog.value = true;
};

const onUpdateOptions = (options) => {
  pagination.itemsLength = options.itemsLength;
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;

  fetchCampaigns({ ...pagination });
};

const getStatus = (item) => {
  if (item.schedule?.canceledAt) return { label: "CANCELLED", color: "error" };
  if (
    item.schedule?.runAt &&
    new Date(item.schedule.runAt).getTime() > Date.now()
  )
    return { label: "SCHEDULED", color: "warning" };
  return { label: "COMPLETED", color: "success" };
};

const exportToExcel = async () => {
  try {
    isExporting.value = true;

    const { dateRange1, dateRange2, ...campaignParams } = pagination;
    const response = await pushNotificationStore.fetchCampaigns({
      ...campaignParams,
      page: -1,
    });

    const rawResults = response.data.results || [];

    const formattedData = rawResults.map((item) => {
      const total = item.messageCount || 0;
      const sent = item.stats?.sent || 0;
      const opened = item.stats?.opened || 0;
      const ctaCount = item.stats?.cta?.__count || 0;

      const sentPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
      const openedPercent = sent > 0 ? Math.round((opened / sent) * 100) : 0;
      const ctaPercent = sent > 0 ? Math.round((ctaCount / sent) * 100) : 0;

      const baseRow = {
        Name: item.campaignName,
        Template: item.templateCode,
        Start: item.createdStamp ? smartFormatDate(item.createdStamp) : "N/A",
        Total: total,
        Sent: sent,
        "Sent %": `${sentPercent}%`,
        Opened: opened,
        "Opened %": `${openedPercent}%`,
        "Total CTA": ctaCount,
        "CTA %": `${ctaPercent}%`,
      };

      const dynamicCTAs = {};
      if (item.stats?.cta) {
        Object.entries(item.stats.cta).forEach(([key, val]) => {
          if (key !== "__count") {
            dynamicCTAs[`CTA - ${key}`] = val;
          }
        });
      }

      return {
        ...baseRow,
        ...dynamicCTAs,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Campaigns");

    const fileName = `Campaigns-data-${dateRange.value}.xlsx`.replaceAll(
      " ",
      "-",
    );
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
    <div
      style="
        width: 100%;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding: 0 12px;
      "
    >
      <VTooltip text="Refresh Data">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            icon
            @click="
              () => {
                fetchCampaigns({ ...pagination });
                fetchStats();
              }
            "
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
        style="width: 250px; margin-left: auto"
        v-model="dateRange"
        prepend-inner-icon="tabler-calendar"
        :config="{
          mode: 'range',
          dateFormat: 'd-m-Y',
          maxDate: tonight,
          onClose: onDateClosed,
          plugins: [customPlugin],
        }"
      />

      <VBtn
        prepend-icon="tabler-plus"
        :to="{ name: 'admin-push-notification-campaigns-add' }"
        style="height: 45px"
      >
        New Notification
      </VBtn>
    </div>

    <VCol cols="12" md="2">
      <CardStatisticsTransactions :statistics="statsTotal" title="Count" />
    </VCol>
    <VCol cols="12" md="10">
      <CardStatisticsTransactions :statistics="statsRest" title="Stats" />
    </VCol>

    <VCol cols="12">
      <MyDataTable
        :headers="headers"
        :items="formattedNotifications"
        :loading="isLoading"
        :server-side="true"
        v-bind="pagination"
        @update:options="onUpdateOptionsDebounced"
      >
        <!-- Expanded Row Data [ show-expand ] -->
        <template #expanded-row="slotProps">
          <tr class="v-data-table__tr">
            <td :colspan="headers.length">
              <NotificationCampaignExpansion
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
                SCHEDULED: 'primary',
                FAILED: 'error',
                COMPLETED: 'success',
                ON_GOING: 'info',
                ENDED: 'error',
              }[item.raw.status]
            "
            variant="tonal"
            size="small"
            class="text-capitalize"
          >
            {{ item.raw.status.replace("_", " ") }}
          </VChip>
          <!-- <VChip
          :color="getStatus(item.raw).color"
          variant="tonal"
          size="small"
          class="text-capitalize"
        >
          {{ getStatus(item.raw).label }}
        </VChip> -->
        </template>

        <!-- sent at -->
        <!-- <template #item.createdStamp="{ item }">
        {{ smartFormatDate(item.raw.createdStamp) }}
      </template> -->

        <!-- backend filtering not supported -->
        <!-- <template #item.schedule.isRecurring="{ item }">
        <div class="d-flex justify-center">
          <VIcon v-if="item.raw.schedule?.isRecurring" size="16" color="info">
            mdi-repeat
          </VIcon>
        </div>
      </template> -->

        <template #item.createdBy="{ item }">
          <span v-if="item.raw.createdBy">{{ item.raw.createdBy }}</span>
          <span v-else> - </span>
        </template>

        <!-- platforms -->
        <template #item.filters.platform="{ item }">
          <div class="d-flex gap-2" v-if="item.raw.filters">
            <VChip
              v-for="p in item.raw.filters.platform"
              :key="p"
              label
              :color="PLATFORM_COLORS[p]?.color"
              class="font-weight-medium"
            >
              {{ PLATFORM_COLORS[p]?.text }}
            </VChip>
          </div>
        </template>

        <template #item.created.stamp="{ item }">
          <IconBtn>
            <VIcon icon="tabler-clock-filled" size="16" class="me-1" />
            <VTooltip
              activator="parent"
              open-delay="1000"
              scroll-strategy="close"
            >
              <div class="py-1">
                <div v-if="item.raw.createdStamp">
                  <strong>Created:</strong>
                  {{ formatDate2(item.raw.createdStamp) }}
                  <div v-if="item.raw.createdBy">
                    <strong>Created by: </strong>{{ item.raw.createdBy }}
                  </div>
                </div>
                <div v-if="item.raw.schedule && item.raw.schedule.runAt">
                  <strong>Scheduled:</strong>
                  {{ formatDate2(item.raw.schedule.runAt) }}
                </div>
                <div
                  v-if="
                    item.raw.schedule &&
                    item.raw.schedule.lastRunAt &&
                    !!item.raw.schedule.isRecurring
                  "
                >
                  <strong>Last run:</strong>
                  {{ formatDate2(item.raw.schedule.lastRunAt) }}
                </div>
                <div
                  v-if="item.raw.schedule && !!item.raw.schedule.isRecurring"
                >
                  <strong>Total runs:</strong>
                  {{ item.raw.schedule.totalRuns || "0" }}
                </div>
                <div v-if="item.raw.schedule && item.raw.schedule.nextRunAt">
                  <strong>Next run:</strong>
                  {{ formatDate2(item.raw.schedule.nextRunAt) }}
                </div>
                <div v-if="item.raw.schedule && item.raw.schedule.until">
                  <strong>Ends on:</strong>
                  {{ formatDate2(item.raw.schedule.until) }}
                </div>
                <div v-if="item.raw.schedule && item.raw.schedule.canceledAt">
                  <strong>Cancelled:</strong>
                  {{ formatDate2(item.raw.schedule.canceledAt) }}
                  <div v-if="item.raw.updatedBy">
                    <strong>Cancelled by: </strong> {{ item.raw.updatedBy }}
                  </div>
                </div>
              </div>
            </VTooltip>
          </IconBtn>
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

        <!-- opened_percent -->
        <template #item.stats.opened_percent="{ item }">
          <div class="d-flex align-center">
            <VProgressLinear
              :model-value="item.raw.stats.opened_percent"
              height="6"
              color="primary"
              class="flex-grow-1 mr-2"
              rounded
              style="min-width: 60px"
            />
            <VChip size="x-small" variant="flat" color="primary">
              {{ item.raw.stats.opened_percent }}%
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
          <!-- <IconBtn
          :to="{
            name: 'admin-push-notification-campaigns-add',
            query: { copy: item.raw.id },
          }"
        >
          <VIcon icon="mdi-content-copy" />
          <VTooltip activator="parent">Duplicate</VTooltip>
        </IconBtn> -->
          <IconBtn
            :to="{
              name: 'admin-push-notification-campaigns-view-id?',
              params: { id: item.raw._id },
            }"
          >
            <VIcon>mdi-eye</VIcon>
            <VTooltip activator="parent">View Campaign Details</VTooltip>
          </IconBtn>
          <IconBtn
            v-if="
              (item.raw.schedule?.isRecurring &&
                new Date(item.raw.schedule?.until) > now &&
                !item.raw.schedule?.canceledAt) ||
              (item.raw.schedule?.type == 'scheduled' &&
                new Date(item.raw.schedule?.runAt) > now &&
                !item.raw.schedule?.canceledAt)
            "
            @click="openCancelDialog(item.raw._id || item.raw.id)"
          >
            <VIcon>mdi-calendar-remove</VIcon>
            <VTooltip activator="parent">Cancel Campaign</VTooltip>
          </IconBtn>
          <IconBtn
            v-if="item.raw.logs?.length || !!item.raw.errorLogs"
            @click="openLogDialog(item.raw.logs, item.raw.errorLogs)"
          >
            <VIcon>mdi-alert-circle-outline</VIcon>
            <VTooltip activator="parent">Logs</VTooltip>
          </IconBtn>
        </template>
      </MyDataTable>
    </VCol>
    <!-- Modal -->
    <VDialog v-model="cancelDialog" max-width="450">
      <VCard>
        <VCardTitle class="text-h6">Cancel Campaign</VCardTitle>
        <VCardText>Are you sure you want to cancel this campaign?</VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="cancelDialog = false"> No </VBtn>
          <VBtn color="error" @click="confirmCancelCampaign"> Yes </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <VDialog v-model="logDialog" max-width="800">
      <VCard>
        <VCardTitle class="text-h6">Logs</VCardTitle>
        <VCardText class="log-scroll-area">
          <VList v-if="selectedLogs.length">
            <VListItem
              v-for="(log, index) in selectedLogs"
              :key="index"
              class="mb-2"
            >
              <!-- The following content must be inside VListItem -->
              <template #prepend>
                <VIcon color="error">mdi-alert</VIcon>
              </template>
              <VListItemTitle class="font-mono text-sm text-error">
                {{ log.error }}
              </VListItemTitle>
              <VListItemSubtitle class="font-mono text-xs text-grey">
                Token: {{ log.token }}
              </VListItemSubtitle>
            </VListItem>
          </VList>
          <div v-else class="text-grey">No logs found.</div>
          <VDivider class="my-4" />
          <div v-if="Object.keys(selectedErrorLogs).length" class="mb-4">
            <div
              v-for="(count, key) in selectedErrorLogs"
              :key="key"
              class="m-1"
            >
              <div v-if="key === 'evaluation'">
                Evaluation:
                <div v-for="(count2, key2) in count" :key="key2" class="m-1">
                  {{ key2 }}: {{ count2 || "-" }}
                </div>
              </div>
            </div>
            <VDivider class="my-4" />
            <div class="text-subtitle-2 mb-2">Error Summary</div>
            <div
              v-for="(count, key) in selectedErrorLogs"
              :key="key"
              class="text-error mb-1"
            >
              <div v-if="key != 'evaluation'">
                <VIcon color="error">mdi-alert</VIcon>
                {{ key.replace(/_/g, " ") }} ({{ count }})
              </div>
            </div>
          </div>
        </VCardText>
        <VCardActions class="sticky-footer">
          <VSpacer />
          <VBtn text @click="logDialog = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <!-- <VDialog v-model="campaignDialog" max-width="600">
      <VCard>
        <VCardTitle class="text-h6">Campaign Details</VCardTitle>
        <VCardText>
          <div class="campaign-details">
            <div style="font-size: 15px;"><strong>Campaign Name:</strong> {{ selectedCampaignLogs.raw.campaignName }}</div>
            <div style="margin-top: 4px;font-size: 15px;"><strong>Template Code:</strong> {{ selectedCampaignLogs.raw.templateCode }}</div>

            <section v-if="selectedCampaignLogs.raw.filter" class="detail-block">
              <h5>Filter</h5>
              <FilterViewer :node="selectedCampaignLogs.raw.filter" />
            </section>

            <section v-if="selectedCampaignLogs.raw?.schedule" class="detail-block">
              <h5>Schedule</h5>
              <div>
                <strong>Duration Type :</strong> 
                {{ formatFieldName(selectedCampaignLogs.raw.schedule.type) }}
              </div>

              <template v-if="selectedCampaignLogs.raw.schedule.type === 'scheduled'">
                <div>
                  <strong>Start Time :</strong>
                  {{ formatDate(selectedCampaignLogs.raw.schedule.runAt) }}
                </div>
              </template>

              <template v-if="selectedCampaignLogs.raw.schedule.isRecurring">
                <VDivider class="my-3" />
                <VChip size="medium" color="primary" variant="tonal" style="padding: 5px 10px;">
                  {{ getReadableRecurrence(selectedCampaignLogs.raw.schedule) }}
                </VChip>
                <VDivider class="my-3" />
                <div>
                  <strong>End Time :</strong>
                  {{ formatDate(selectedCampaignLogs.raw.schedule.until) }}
                </div>
              </template>
            </section>
            
          </div>
        </VCardText>
        <VCardActions class="sticky-footer">
          <VSpacer />
          <VBtn text @click="campaignDialog = false">Close</VBtn>
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
.col-status {
  max-width: 125px;
}
.log-scroll-area {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px; /* optional for scrollbar spacing */
}
.sticky-footer {
  position: sticky;
  bottom: 0;
  background-color: white;
  z-index: 1;
  border-top: 1px solid #eee;
}
</style>
