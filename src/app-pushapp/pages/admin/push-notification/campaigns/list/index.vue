<script setup>
import { PLATFORM_COLORS } from "@app-pushapp/utils/constants";
// import NotificationQuickAnalytics from "@app-pushapp/views/admin/push-notification/NotificationQuickAnalytics.vue";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
import debounce from "lodash/debounce";

const pushNotificationStore = usePushNotificationStore();
const isLoading = ref(false);
const notifications = ref([]);
const headers = [
  //   { title: "", key: "data-table-expand" },
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
  },
  {
    title: "Platform(s)",
    key: "filters.platform",
    sortable: false,
  },
  {
    title: "Start",
    key: "createdStamp",
  },
  {
    title: "Total",
    key: "messageCount",
    sortable: false,
  },
  {
    title: "Sent",
    key: "stats.sent",
    sortable: false,
  },
  {
    title: "Failed",
    key: "stats.failed",
    sortable: false,
  },
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
    campaignName: "",
    templateCode: "",
  },
});

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
  <VCard v-if="notifications" id="invoice-list">
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
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
      :items="notifications"
      :loading="isLoading"
      :server-side="true"
      v-bind="pagination"
      @update:options="onUpdateOptionsDebounced"
    >
      <!-- Expanded Row Data [ show-expand ] -->
      <!-- <template #expanded-row="slotProps">
        <tr class="v-data-table__tr">
          <td :colspan="headers.length">
            <NotificationQuickAnalytics :data="slotProps.item.raw" />
          </td>
        </tr>
      </template> -->

      <!-- status -->
      <template #item.status="{ item }">
        <div class="d-flex gap-2">{{ item.raw.status }}</div>
      </template>

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

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          :to="{
            name: 'admin-push-notification-campaigns-add',
            query: { copy: item.raw.id },
          }"
        >
          <VIcon icon="mdi-content-copy" />
          <VTooltip activator="parent">Duplicate</VTooltip>
        </IconBtn>
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
.col-status {
  max-width: 125px;
}
</style>
