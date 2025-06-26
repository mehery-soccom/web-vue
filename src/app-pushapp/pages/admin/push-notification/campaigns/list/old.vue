<script setup>
import NotificationQuickAnalytics from "@app-pushapp/views/admin/push-notification/NotificationQuickAnalytics.vue";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";

const pushNotificationStore = usePushNotificationStore();
const isLoading = ref(false);
const notifications = ref([]);
const totalNotifications = ref(0);
// const itemsPerPage = ref(10);
const colors = {
  success: {
    color: "success",
  },
  failed: {
    color: "error",
  },
};
const headers = [
  { title: "", key: "data-table-expand" },
  {
    title: "Notification",
    key: "notification",
  },
  {
    title: "Status",
    key: "status",
    sortable: false,
  },
  // {
  //   title: "Platform(s)",
  //   key: "platforms",
  //   sortable: false,
  // },
  {
    title: "Start / Send",
    key: "sent_at",
  },
  // {
  //   title: "End",
  //   key: "end",
  // },
  {
    title: "Sends",
    key: "sent_to.total",
    sortable: false,
  },
  {
    title: "Opens",
    key: "opened.total",
    sortable: false,
  },
  {
    title: "",
    key: "actions",
    sortable: false,
  },
];

onMounted(async () => {
  fetchSimpleNotifications();
});

// 👉 watch for data table options like itemsPerPage,page,searchQuery,sortBy etc...
watchEffect(() => {});

// 👉 Fetch
const fetchSimpleNotifications = () => {
  isLoading.value = true;
  pushNotificationStore
    .fetchSimpleNotifications()
    .then((response) => {
      notifications.value = response.results.map((r) => ({ ...r, id: r._id }));
      totalNotifications.value = response.data?.total;
    })
    .catch((error) => {
      console.log(error);
    })
    .finally(() => {
      isLoading.value = false;
    });
};

// const onUpdateOptions = (newValue) => {
//   console.log("onUpdateOptions", newValue);
//   // options.value = newValue;

//   fetchSimpleNotifications();
// };
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
      show-expand
    >
      <!-- Expanded Row Data -->
      <template #expanded-row="slotProps">
        <tr class="v-data-table__tr">
          <td :colspan="headers.length">
            <NotificationQuickAnalytics :data="slotProps.item.raw" />
          </td>
        </tr>
      </template>

      <!-- notification -->
      <template #item.notification="{ item }">
        <div class="d-flex flex-column ms-3 col-status">
          <span
            class="d-block font-weight-medium text--primary text-truncate"
            >{{ item.raw.title }}</span
          >
          <small class="text-truncate">{{ item.raw.message }}</small>
        </div>
      </template>

      <!-- status -->
      <template #item.status="{ item }">
        <div class="d-flex gap-2">
          <VChip
            v-for="[k, v] in Object.entries(item.raw.status)"
            :key="k"
            label
            :color="colors[k]?.color"
            class="font-weight-medium"
          >
            {{ v }}
          </VChip>
        </div>
      </template>

      <!-- sent at -->
      <template #item.sent_at="{ item }">
        {{ smartFormatDate(item.raw.sent_at) }}
      </template>

      <!-- platforms -->
      <!-- <template #item.platforms="{ item }">
        <div class="d-flex gap-2">
          <VChip
            v-for="p in item.raw.platforms"
            :key="p.platform_type"
            label
            :color="colors[p.platform_type].color"
            class="font-weight-medium"
          >
            {{ colors[p.platform_type].text }}
          </VChip>
        </div>
      </template> -->

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          :to="{
            name: 'admin-push-notification-campaigns-add',
            query: { copy: item.raw.notification_id },
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
