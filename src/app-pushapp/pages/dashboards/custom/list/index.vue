<script setup>
import DashboardBlock from "@/app-pushapp/views/dashboards/custom/DashboardBlock.vue";
import { useCustomDashboardStore } from "@/app-pushapp/views/dashboards/custom/useCustomDashboardStore";

const { show } = inject("snackbar");
const router = useRouter();
const store = useCustomDashboardStore();

const isLoading = ref(false);
const blocks = ref([]);
const deleteTarget = ref(null);
const isDeleteDialogOpen = ref(false);
const isDeleting = ref(false);

const loadBlocks = async () => {
  isLoading.value = true;
  try {
    const res = await store.fetchDashboards({ page: 1, itemsPerPage: 100 });
    blocks.value = res?.data?.results || res?.data?.data || [];
  } catch (error) {
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Failed to load dashboard blocks",
      color: "error",
    });
    blocks.value = [];
  } finally {
    isLoading.value = false;
  }
};

const goAdd = () => {
  router.push({ name: "dashboards-custom-add-id?" });
};

const onEdit = (item) => {
  router.push({ name: "dashboards-custom-add-id?", params: { id: item._id } });
};

const onDelete = (item) => {
  deleteTarget.value = item;
  isDeleteDialogOpen.value = true;
};

const confirmDelete = async () => {
  if (!deleteTarget.value?._id) return;
  isDeleting.value = true;
  try {
    await store.deleteDashboard({ id: deleteTarget.value._id });
    show({ message: "Block deleted successfully", color: "success" });
    isDeleteDialogOpen.value = false;
    deleteTarget.value = null;
    await loadBlocks();
  } catch (error) {
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Failed to delete block",
      color: "error",
    });
  } finally {
    isDeleting.value = false;
  }
};

onMounted(loadBlocks);
</script>

<template>
  <div>
    <VRow>
      <VCol cols="12">
        <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-2">
          <div>
            <h3 class="mb-1">Custom Dashboard</h3>
            <p class="text-caption text-medium-emphasis mb-0">
              Create filter blocks and track live user counts
            </p>
          </div>
          <VBtn color="primary" prepend-icon="tabler-plus" @click="goAdd">
            Add Block
          </VBtn>
        </div>
      </VCol>

      <VCol v-if="isLoading" cols="12" class="text-center py-12">
        <VProgressCircular indeterminate color="primary" size="40" />
      </VCol>

      <template v-else>
        <VCol v-if="!blocks.length" cols="12">
          <VCard variant="outlined" class="pa-10 text-center">
            <VIcon icon="tabler-layout-dashboard" size="48" class="mb-3 text-disabled" />
            <h4 class="mb-1">No blocks yet</h4>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Add your first block with a cohort or custom filter
            </p>
            <VBtn color="primary" prepend-icon="tabler-plus" @click="goAdd">
              Add Block
            </VBtn>
          </VCard>
        </VCol>

        <VCol
          v-for="(item, idx) in blocks"
          :key="item._id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <DashboardBlock
            :item="item"
            :color-index="idx"
            @edit="onEdit"
            @delete="onDelete"
          />
        </VCol>
      </template>
    </VRow>

    <VDialog v-model="isDeleteDialogOpen" max-width="420">
      <VCard>
        <VCardTitle>Delete block?</VCardTitle>
        <VCardText>
          Are you sure you want to delete
          <strong>{{ deleteTarget?.title }}</strong>?
          This cannot be undone.
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            color="secondary"
            :disabled="isDeleting"
            @click="isDeleteDialogOpen = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            variant="flat"
            :loading="isDeleting"
            @click="confirmDelete"
          >
            Delete
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
