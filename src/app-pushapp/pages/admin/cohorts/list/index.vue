<script setup>
import debounce from "lodash/debounce";
import { useCohortsStore } from "@app-pushapp/views/admin/cohorts/useCohortsStore";
import { useCohorts } from "@/app-pushapp/views/admin/cohorts/useCohorts";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
const { show } = inject("snackbar");

const CohortsStore = useCohortsStore();
const isLoading = ref(false);
const items = ref([]);
const headers = computed(() => [
  {
    title: "Name",
    key: "name",
    align: "center",
  },
  {
    title: "Desc",
    key: "desc",
    align: "center",
  },
  {
    title: "Active",
    key: "active",
    align: "center",
    filterType: "switch",
  },
  {
    title: "Created",
    key: "createdAt",
    align: "center",
  },
  {
    title: "Actions",
    key: "actions",
    // align: "center",
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
    active: true,
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

    const response = await CohortsStore.fetchCohorts(params);
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
  CohortsStore.deleteCohort({ id })
    .then(() => {
      fetchItems({ ...pagination });
      dialogCloseRef.value = false;
      show({ message: "Cohort deleted successfully", color: "success" });
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
          :to="{ name: 'admin-cohorts-add-id?' }"
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
      <!-- active -->
      <template #item.active="{ item }">
        <VIcon v-if="item.raw.active" size="16" color="success" start>
          mdi-check
        </VIcon>
        <VIcon v-else size="16" color="error" start> mdi-close </VIcon>
      </template>

      <!-- created at -->
      <template #item.createdAt="{ item }">
        {{ smartFormatDate(item.raw.createdAt) }}
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          :to="{
            name: 'admin-cohorts-add-id?',
            params: { id: item.raw._id },
          }"
        >
          <VIcon icon="mdi-eye" />
          <VTooltip activator="parent">View</VTooltip>
        </IconBtn>
        <IconBtn v-if="item.raw.active">
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
