<script setup>
import debounce from "lodash/debounce";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import AbTestingMetrics from "@/app-pushapp/views/admin/app-engagements/AbTestingMetrics.vue";
import FilterViewer from "@/app-pushapp/views/admin/app-engagements/FilterViewer.vue";
const { show } = inject("snackbar");

const { TYPES, SUB_TYPES } = useAppEngagements();
const appEngagementsStore = useAppEngagementsStore();
const TYPES2 = TYPES.map((c) => c.value);
const isLoading = ref(false);
const items = ref([]);
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
      item.status === "DERIVE"
        ? getCampaignStatus(item.schedule, item.abTesting?.enabled)
        : item.status,
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
  {
    title: "Type",
    key: "action.template.type",
    filterType: "select",
    filterOptions: TYPES2,
  },
  {
    title: "SubType",
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
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    title: null,
    "action.template.code": null,
    "action.template.type": null,
    "action.template.subType": null,
    "abTesting.enabled": false,
    status: null,
  },
});

onMounted(async () => {
  fetchCampaigns({ ...pagination });
});

const logDialog = ref(false);
const selectedLogs = ref([]);
const openLogDialog = (logs) => {
  selectedLogs.value = logs || [];
  logDialog.value = true;
};

const getCampaignStatus = (
  { durationType, startDate, endDate },
  isAbTesting,
) => {
  if (durationType === "manual") {
    if (isAbTesting) return "TESTING";
    return "ON_GOING";
  }

  if (durationType === "specific") {
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
          :to="{ name: 'admin-app-engagements-campaigns-add' }"
        >
          New Campaign
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

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

      <!-- created at -->
      <template #item.created.stamp="{ item }">
        {{ smartFormatDate(item.raw.created.stamp) }}
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
      <template #item.action.template.type="{ item }">
        {{ item.raw.action.template.type }}
        {{
          item.raw.action.templateB?.type
            ? "| " + item.raw.action.templateB?.type
            : ""
        }}
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
        <IconBtn @click="openLogDialog(item)">
          <VIcon>mdi-eye</VIcon>
          <VTooltip activator="parent">Logs</VTooltip>
        </IconBtn>
      </template>
    </MyDataTable>
    <VDialog v-model="logDialog" max-width="600">
      <VCard>
        <VCardTitle class="text-h6">Campaign Details</VCardTitle>
        <VCardText>
          <div class="campaign-details">
            <div><strong>Campaign ID:</strong> {{ selectedLogs.raw._id }}</div>

            <!-- Audience -->
            <section class="detail-block">
              <h5>Audience</h5>
              <div>
                <div>
                  <strong>User Set:</strong>
                  {{ selectedLogs.raw.audience?.userSet }}
                </div>
              </div>
            </section>

            <!-- Filter -->
            <section v-if="selectedLogs.raw.filter" class="detail-block">
              <h5>Filter</h5>
              <FilterViewer :node="selectedLogs.raw.filter" />
            </section>

            <!-- Schedule -->
            <section v-if="selectedLogs.raw.schedule" class="detail-block">
              <h5>Schedule</h5>
              <div v-if="selectedLogs.raw.schedule.durationType === 'manual'">
                <p><strong>Duration Type:</strong> Manual</p>
              </div>
              <div v-else>
                <p>
                  <strong>Duration Type:</strong>
                  {{ formatFieldName(selectedLogs.raw.schedule.durationType) }}
                </p>
                <p>
                  <strong>Start Date:</strong>
                  {{ formatDate(selectedLogs.raw.schedule.startDate) }}
                </p>
                <p>
                  <strong>End Date:</strong>
                  {{ formatDate(selectedLogs.raw.schedule.endDate) }}
                </p>
                <p>
                  <strong>Repeat Type:</strong>
                  {{
                    formatFieldName(
                      selectedLogs.raw.schedule.repeatType || "N/A",
                    )
                  }}
                </p>
              </div>
            </section>
          </div>
        </VCardText>
        <VCardActions class="sticky-footer">
          <VSpacer />
          <VBtn text @click="logDialog = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
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
