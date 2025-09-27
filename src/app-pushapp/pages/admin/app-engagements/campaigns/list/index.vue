<script setup>
import debounce from "lodash/debounce";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
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
          ? Math.round(((item.stats.cta?.count || 0) / item.stats.sent) * 100)
          : 0,
    },
    status:
      item.status === "DERIVE" ? getCampaignStatus(item.schedule) : item.status,
  }))
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
    title: "Status",
    key: "status",
    filterType: "select",
    filterOptions: [
      { title: "Created", value: "CREATED" },
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
    key: "stats.cta.count",
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
    status: null,
  },
});

onMounted(async () => {
  fetchCampaigns({ ...pagination });
});

const getCampaignStatus = ({ durationType, startDate, endDate }) => {
  if (durationType === "manual") {
    return "ON_GOING";
  }

  if (durationType === "specific") {
    const now = Date.now();

    if (now < startDate) {
      return "CREATED";
    }
    if (now >= startDate && now <= endDate) {
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
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
}
function formatFieldName(field) {
  if (!field) return "";
  const withSpaces = field.replace(/_/g, " ");
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
          <td :colspan="headers.length">
            <div>Campaign ID : {{ slotProps.item.raw._id }}</div>
            <div class="detail-row">
              <section class="detail-block">
                <h5>Audience</h5>
                <div>
                  <div><strong>User Set:</strong> {{ slotProps.item.raw.audience?.userSet }}</div>
                  <!-- <div><strong>Segment Condition:</strong> {{ slotProps.item.raw.audience?.segmentCondition || 'N/A' }}</div>
                  <div><strong>Segment:</strong> {{ slotProps.item.raw.audience?.segment || 'N/A' }}</div> -->
                </div>
              </section>
              <section v-if="slotProps.item.raw.filter" class="detail-block">
                <h5>Filter <span v-if="!!slotProps.item.raw.filter.conjuction">{{ formatFieldName(slotProps.item.raw.filter.conjuction) }}</span></h5>
                <div v-if="slotProps.item.raw.filter.children?.length">
                    <div v-for="(child, idx) in slotProps.item.raw.filter.children" :key="idx">
                      <div style="margin: 4px 10px;"><strong>{{ formatFieldName(child.filterType) }}</strong></div>
                      <section class="detail-block" style="max-width: 100%;">
                        <div><span>{{ formatFieldName(child.filterType) }}:</span> {{ formatFieldName(child.field) }}</div>
                        <div>Operator: {{ formatFieldName(child.operator) }}</div>
                        <div>Frequency: {{ formatFieldName(child.freqOperator) }}</div>
                        <div>Value: {{ formatFieldName(child.freqCount || 'N/A') }}</div>
                        <div v-if="child.freqPeriod">Duration: ({{ formatFieldName(child.freqPeriod) }})</div>
                      </section>
                    </div>
                </div>
                <div v-else>
                  <div>No filters defined</div>
                </div>
              </section>
              <section v-if="slotProps.item.raw.schedule" class="detail-block">
                <h5>Schedule</h5>
                <div v-if="slotProps.item.raw.schedule.durationType === 'manual'">
                  <p><strong>Duration Type:</strong> Manual</p>
                </div>
                <div v-else>
                  <p><strong>Duration Type:</strong> {{ formatFieldName(slotProps.item.raw.schedule.durationType) }}</p>
                  <p><strong>Start Date:</strong> {{ formatDate(slotProps.item.raw.schedule.startDate) }}</p>
                  <p><strong>End Date:</strong> {{ formatDate(slotProps.item.raw.schedule.endDate) }}</p>
                  <p><strong>Repeat Type:</strong> {{ formatFieldName(slotProps.item.raw.schedule.repeatType || 'N/A') }}</p>
                </div>
              </section>
            </div>
          </td>
        </tr>
      </template>

      <!-- status -->
      <template #item.status="{ item }">
        <VChip
          :color="
            item.raw.status === 'ON_GOING'
              ? 'success'
              : item.raw.status === 'ENDED'
              ? 'error'
              : 'secondary'
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
          v-if="item.raw.status !== 'ENDED'"
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
      </template>
    </MyDataTable>
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
  display: flex;
  flex-wrap: wrap; /* allows wrapping if not enough space */
  gap: 20px;       /* spacing between blocks */
  margin: 12px 0px;
  // max-width: calc(100vw - 100px);
}

.detail-block {
  // flex: 0 0 auto; /* fit to content width */
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  width: 29vw;
  min-width: 250px; 
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
