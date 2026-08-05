<script setup>
import debounce from "lodash/debounce";
import { useFlowsStore } from "@app-pushapp/views/admin/journeys/useFlowsStore";
import { useRoute, useRouter } from 'vue-router';
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
const { show } = inject("snackbar");

const FlowsStore = useFlowsStore();
const isLoading = ref(false);
const route = useRoute();
const router = useRouter();
const items = ref([]);
const headers = computed(() => [
  {
    title: "Name",
    key: "name",
    align: "center",
  },
  {
    title: "Description",
    key: "desc",
    align: "center",
  },
  {
    title: "Status",
    key: "status",
    align: "center",
    filterType: "select",
    filterOptions: [
      { title: "Draft", value: "DRAFT" },
      { title: "Live", value: "ON_GOING" },
      { title: "Paused", value: "PAUSED" },
      { title: "Terminated", value: "ENDED" },
    ],
  },
  {
    title: "Created at",
    key: "createdAt",
    align: "center",
  },
  {
    title: "Created By",
    key: "createdBy",
    align: "center",
  },
  {
    title: "Updated at",
    key: "updatedAt",
    align: "center",
  },
  {
    title: "Updated By",
    key: "updatedBy",
    align: "center",
  },
  {
    title: "Actions",
    key: "actions",
    align: "start",
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
    desc: null,
    status: null,
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

    const response = await FlowsStore.fetchFlows(params);
    if(response.data?.results){
      items.value = response.data.results.map((r) => ({
        ...r,
        id: r._id,
      }));
      pagination.itemsLength = response.data.pagination.total;
    }
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const cloneItem = (record) => {
  FlowsStore.setCloneData({
    filter: record.filter,
    flow: record.flow,
    flowRenderer: record.flowRenderer,
  });
  router.push({ name: "admin-journey-add-id?" });
};

const updateFlowStatus = (id, status) => {
  isLoading.value = true;

  FlowsStore.updateFlow({ id, status })
    .then(() => {
      fetchItems({ ...pagination });
      show({
        message: `Flow ${status === "ON_GOING" ? "started" : "paused"} successfully`,
        color: "success",
      });
    })
    .catch(() => {
      show({
        message: "Something went wrong",
        color: "error",
      });
    })
    .finally(() => {
      isLoading.value = false;
    });
};

// 👉 Delete Item
const deleteItem = (id, dialogCloseRef) => {
  isLoading.value = true;
  FlowsStore.deleteFlow({ id })
    .then(() => {
      fetchItems({ ...pagination });
      dialogCloseRef.value = false;
      show({ message: "Flow deleted successfully", color: "success" });
    })
    .catch((error) => {
      show({ message: "Something went wrong", color: "error" });
    })
    .finally(() => {
      isLoading.value = false;
    });
};

onMounted(async () => {});
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
          :to="{ name: 'admin-journey-add-id?' }"
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
      <template #item.desc="{ item }">
        <VTooltip location="top">
          <template #activator="{ props }">
            <div class="desc-cell" v-bind="props"> {{ item.raw.desc }}</div>
          </template>
          <span>{{ item.raw.desc }}</span>
        </VTooltip>
      </template>

      <template #item.status="{ item }">
        <!-- <span>{{ (item.raw.status).replace(/_/g, ' ') }}</span> -->
        <VChip
          :color="{
            DRAFT: 'secondary',
            ON_GOING: 'success',
            PAUSED: 'warning',
            ENDED: 'error',
          }[item.raw.status]"
          variant="tonal"
          size="small"
        >
          {{
            {
              DRAFT: "Draft",
              ON_GOING: "Live",
              PAUSED: "Paused",
              ENDED: "Terminated",
            }[item.raw.status]
          }}
        </VChip>
      </template>

      <!-- created at -->
        <template #item.createdAt="{ item }">
          <span v-if="item.raw.createTime && item.raw.createTime.stamp">{{ smartFormatDate(item.raw.createTime.stamp) }}</span>
          <span v-else>-</span>
        </template>

      <template #item.createdBy="{ item }">
        <span v-if="item.raw.createTime && item.raw.createTime.byUser">{{ item.raw.createTime.byUser }}</span>
        <span v-else>-</span>
      </template>

      <template #item.updatedAt="{ item }">
        <span v-if="item.raw.updateTime && item.raw.updateTime.stamp">{{ smartFormatDate(item.raw.updateTime.stamp) }}</span>
        <span v-else>-</span>
      </template>

      <template #item.updatedBy="{ item }">
        <span v-if="item.raw.updateTime && item.raw.updateTime.byUser">{{ item.raw.updateTime.byUser }}</span>
        <span v-else>-</span>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          :to="{
            name: 'admin-journey-add-id?',
            params: { id: item.raw._id },
          }"
        >
          <VIcon icon="mdi-eye" />
          <VTooltip activator="parent">View</VTooltip>
        </IconBtn>
        <IconBtn
          v-if="item.raw.status === 'DRAFT'"
          @click="updateFlowStatus(item.raw._id, 'ON_GOING')"
        >
          <VIcon icon="mdi-rocket-launch" />
          <VTooltip activator="parent">Launch Flow</VTooltip>
        </IconBtn>
        <IconBtn
          v-if="item.raw.status === 'DRAFT'"
          :to="{
            name: 'admin-journey-add-id?',
            params: { id: item.raw._id },
            query: { edit: null},
          }"
        >
          <VIcon icon="mdi-pencil-outline" />
          <VTooltip activator="parent">Edit Flow</VTooltip>
        </IconBtn>

        <IconBtn
          v-else-if="item.raw.status === 'ON_GOING'"
          @click="updateFlowStatus(item.raw._id, 'PAUSED')"
        >
          <VIcon icon="mdi-pause" />
          <VTooltip activator="parent">Pause Flow</VTooltip>
        </IconBtn>

        <IconBtn
          v-else-if="item.raw.status === 'PAUSED'"
          @click="updateFlowStatus(item.raw._id, 'ON_GOING')"
        >
          <VIcon icon="mdi-play-circle" />
          <VTooltip activator="parent">Resume Flow</VTooltip>
        </IconBtn>
        <IconBtn @click="cloneItem(item.raw)">
          <VIcon icon="mdi-content-copy" />
          <VTooltip activator="parent">Clone Flow</VTooltip>
        </IconBtn>
        <IconBtn v-if="['ON_GOING', 'PAUSED'].includes(item.raw.status)">
          <VIcon icon="mdi-close-circle" />
          <v-dialog activator="parent" max-width="350">
            <template v-slot:default="{ isActive }">
              <v-card
                class=""
                prepend-icon="mdi-alert"
                text="Are you certain, you want to end the flow ?"
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
          <VTooltip activator="parent">End flow</VTooltip>
        </IconBtn>
      </template>
    </MyDataTable>
  </VCard>
</template>

<style>
.desc-cell {
  max-width: 40vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
