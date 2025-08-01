<script setup>
import debounce from "lodash/debounce";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";

const { TYPES, SUB_TYPES } = useAppEngagements();
const appEngagementsStore = useAppEngagementsStore();

const isLoading = ref(false);
const items = ref([]);
const headers = [
  // { title: "", key: "data-table-expand" },
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
    filterOptions: TYPES,
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
  },
  {
    title: "Delivered",
    key: "stats.sent",
  },
  {
    title: "Delivery %",
    key: "stats.sent_percent",
  },
  {
    title: "CTA",
    key: "stats.cta.count",
  },
  {
    title: "CTA %",
    key: "stats.cta_percent",
  },
  {
    title: "View time (sec)",
    key: "stats.viewTime",
  },
  {
    title: "Avg time / view",
    key: "stats.avgTimePerView",
  },
  {
    title: "Avg time / User",
    key: "stats.avgTimePerUser",
  },
  // {
  //   title: "",
  //   key: "actions",
  //   sortable: false,
  // },
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
      :items="items"
      :loading="isLoading"
      :server-side="true"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
    >
      <!-- Expanded Row Data [ show-expand ] -->
      <template #expanded-row="slotProps">
        <tr class="v-data-table__tr">
          <td :colspan="headers.length"></td>
        </tr>
      </template>

      <!-- created at -->
      <template #item.created.stamp="{ item }">
        {{ smartFormatDate(item.raw.created.stamp) }}
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }"> </template>
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
</style>
