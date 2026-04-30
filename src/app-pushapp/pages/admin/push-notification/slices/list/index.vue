<script setup>
import debounce from "lodash/debounce";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
const { show } = inject("snackbar");

const pushNotificationStore = usePushNotificationStore();
const channelsStore = useChannelsStore();
const channelList = ref([]);
const isLoading = ref(false);
const items = ref([]);
const headers = computed(() => [
  {
    title: "Name",
    key: "name",
    align: "center",
  },
  // {
  //   title: "Projection",
  //   key: "subscribers",
  //   align: "center",
  // },
  {
    title: "Status",
    key: "status",
    filterType: "select",
    filterOptions: [
      { title: "Created", value: "CREATED" },
      { title: "Building", value: "BUILDING" },
      { title: "Ready", value: "READY" },
      { title: "Expired", value: "EXPIRED" },
      { title: "Failed", value: "FAILED" },
    ],
  },
  {
    title: "Mobile App",
    key: "channel_id",
    filterType: "select",
    filterOptions: channelList.value.map((c) => ({
      title: c.channel_name,
      value: c.channel_id,
    })),
  },
  // {
  //   title: "Base Topics",
  //   key: "baseTopics",
  //   align: "center",
  // },
  {
    title: "Created",
    key: "createdAt",
    align: "center",
  },
  {
    title: "Actions",
    key: "actions",
    align: "center",
    sortable: false,
  },
]);
const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    name: null,
    status: null,
    channel_id: null,
  },
});

const onUpdateOptions = (options) => {
  pagination.itemsLength = options.itemsLength;
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;

  fetchItems({ ...pagination });
};
const onUpdateOptionsDebounced = debounce((options) => {
  onUpdateOptions(options);
}, 300);

// 👉 Fetch Items
const fetchItems = async (params) => {
  try {
    isLoading.value = true;

    const response = await pushNotificationStore.fetchSlices(params);
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

// 👉 Delete Item
const deleteItem = (id, dialogCloseRef) => {
  isLoading.value = true;
  pushNotificationStore
    .deleteSlice({ id })
    .then(() => {
      fetchItems({ ...pagination });
      dialogCloseRef.value = false;
      show({ message: "Slice deleted successfully", color: "success" });
    })
    .catch((error) => {
      show({ message: "Something went wrong", color: "error" });
    })
    .finally(() => {
      isLoading.value = false;
    });
};

onMounted(async () => {
  let channelsRes = await channelsStore
    .fetchChannels()
    .catch((error) => console.log("[slice] [list] fetchChannels", error));
  if (channelsRes.results) channelList.value = channelsRes.results;
});
</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          icon
          @click="() => fetchItems({ ...pagination })"
          :loading="isLoading"
          variant="text"
        >
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <!-- 👉 Create -->
        <VBtn
          prepend-icon="tabler-plus"
          :to="{ name: 'admin-push-notification-slices-add-id?' }"
        >
          New
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
      <!-- baseTopics -->
      <template #item.baseTopics="{ item }">
        <VTooltip location="top">
          <template #activator="{ props }">
            <div
              v-bind="props"
              class="d-inline-flex align-center cursor-pointer"
            >
              <VIcon
                icon="tabler-layers-intersect"
                size="18"
                class="me-1 text-primary"
              />
              <span>{{ item.raw.baseTopics.length }}</span>
            </div>
          </template>

          <div class="d-flex flex-wrap ga-1">
            <VChip
              v-for="topic in item.raw.baseTopics"
              :key="topic"
              size="x-small"
              variant="tonal"
            >
              {{ topic }}
            </VChip>
          </div>
        </VTooltip>
      </template>

      <!-- subscribers count -->
      <template #item.subscribers="{ item }">
        {{ item.raw.buildStats?.tokensSubscribed || 0 }}
      </template>

      <!-- channel -->
      <template #item.channel_id="{ item }">
        {{
          channelList.find((c) => c.channel_id === item.raw.channel_id)
            ?.channel_name || item.raw.channel_id
        }}
      </template>

      <!-- created at -->
      <template #item.createdAt="{ item }">
        {{ smartFormatDate(item.raw.createdAt) }}
      </template>

      <!-- updated at -->
      <template #item.updatedAt="{ item }">
        {{ smartFormatDate(item.raw.updatedAt) }}
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          :to="{
            name: 'admin-push-notification-slices-add-id?',
            params: { id: item.raw._id },
          }"
        >
          <VIcon icon="mdi-eye" />
          <VTooltip activator="parent">View</VTooltip>
        </IconBtn>
        <IconBtn>
          <VIcon>mdi-trash</VIcon>
          <v-dialog activator="parent" max-width="340">
            <template v-slot:default="{ isActive }">
              <v-card
                class=""
                prepend-icon="mdi-alert"
                text="Are you certain, you want to delete ?"
                title="Confirm"
              >
                <template v-slot:actions>
                  <v-btn
                    class="ml-auto"
                    text="Yes"
                    @click="deleteItem(item.raw._id, isActive)"
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
          <VTooltip activator="parent">Delete</VTooltip>
        </IconBtn>
      </template>
    </MyDataTable>
  </VCard>
</template>

<style lang="scss"></style>
