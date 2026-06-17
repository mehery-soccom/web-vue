<script setup>
import { PLATFORM_COLORS } from "@app-pushapp/utils/constants";
// import NotificationQuickAnalytics from "@app-pushapp/views/admin/push-notification/NotificationQuickAnalytics.vue";
import NotificationCampaignExpansion from "@/app-pushapp/views/admin/push-notification/NotificationCampaignExpansion.vue";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
import FilterViewer from "@/app-pushapp/views/admin/app-engagements/FilterViewer.vue";
import debounce from "lodash/debounce";

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
  // {
  //   title: "Status",
  //   key: "status",
  // },
  {
    title: "Start",
    key: "createdStamp",
  },
  {
    title: "Total",
    key: "messageCount",
    sortable: false,
    align: "center",
  },
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
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    campaignName: "",
    templateCode: "",
  },
});
const now = new Date();
const logDialog = ref(false);
const selectedLogs = ref([]);
function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString();
}
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
  const runTime = hour !== undefined && minute !== undefined
      ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` : null;
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

  if (runTime) text += ` at ${runTime}`;
  return text || "N/A";
};

onMounted(async () => {
  fetchCampaigns({ ...pagination });
});

const fetchCampaigns = async (params) => {
  try {
    isLoading.value = true;

    const response = await pushNotificationStore.fetchCampaigns(params);
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
  try{
    isLoading.value = true;
    const response = await pushNotificationStore.cancelCampaign(id);
    if(response.data) await fetchCampaigns({ ...pagination });
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}
const cancelDialog = ref(false);
const campaignToCancel = ref(null);
const openCancelDialog = id => {
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
const openLogDialog = (logs) => {
  selectedLogs.value = logs || [];
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

const onUpdateOptionsDebounced = debounce((options) => {
  onUpdateOptions(options);
}, 300);
</script>

<template>
  <VCard id="invoice-list">
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          icon
          @click="() => fetchCampaigns({ ...pagination })"
          :loading="isLoading"
          variant="text"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <!-- 👉 Create -->
        <VBtn
          prepend-icon="tabler-plus"
          :to="{ name: 'admin-push-notification-campaigns-add' }"
        >
          New Notification
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

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
            <NotificationCampaignExpansion :stats="slotProps.item.raw.stats" />
          </td>
        </tr>
      </template>

      <!-- status -->
      <!-- <template #item.status="{ item }">
        <div class="d-flex gap-2">{{ item.raw.status }}</div>
      </template> -->

      <!-- sent at -->
      <template #item.createdStamp="{ item }">
        {{ smartFormatDate(item.raw.createdStamp) }}
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
          v-if="(item.raw.schedule?.isRecurring && new Date(item.raw.schedule?.until) > now && !item.raw.schedule?.canceledAt) 
          || (item.raw.schedule?.type == 'scheduled' && new Date(item.raw.schedule?.runAt) > now && !item.raw.schedule?.canceledAt)"
          @click="openCancelDialog(item.raw._id || item.raw.id)"
        >
          <VIcon>mdi-calendar-remove</VIcon>
          <VTooltip activator="parent">Cancel Campaign</VTooltip>
        </IconBtn>
        <IconBtn
          v-if="item.raw.logs?.length"
          @click="openLogDialog(item.raw.logs)"
        >
          <VIcon>mdi-alert-circle-outline</VIcon>
          <VTooltip activator="parent">Logs</VTooltip>
        </IconBtn>
      </template>
    </MyDataTable>
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
  </VCard>
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
