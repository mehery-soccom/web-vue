<script setup>
import DashboardBlock from "@/app-pushapp/views/dashboards/custom/DashboardBlock.vue";
import { useCustomDashboardStore } from "@/app-pushapp/views/dashboards/custom/useCustomDashboardStore";
import { useCohortsStore } from "@app-pushapp/views/admin/cohorts/useCohortsStore";
import AppDateTimePicker from "@/app-tikat/@core/components/app-form-elements/AppDateTimePicker.vue";
import { useDatePickerFilters } from "@app-tikat/views/dashboard/analytics/useDatePickerFilters";

const { show } = inject("snackbar");
const router = useRouter();
const store = useCustomDashboardStore();
const cohortsStore = useCohortsStore();
const { customPlugin } = useDatePickerFilters();

const isLoading = ref(false);
const blocks = ref([]);
const deleteTarget = ref(null);
const isDeleteDialogOpen = ref(false);
const isDeleting = ref(false);

const selectedCohort = ref(null);
const tonight = new Date().setHours(23, 59, 59, 999);
const formatDate = (date) => date.toLocaleDateString("en-GB").split("/").join("-");
const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 6));
const dateRange = ref(`${formatDate(sevenDaysAgo)} to ${formatDate(new Date())}`);

const formattedCohortList = computed(() => {
  return (cohortsStore.cohorts || [])
    .map((c) => ({ title: c.name, value: c._id }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

const timezone =
  window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] ||
  "Asia/Kolkata";

const parsedDateRange = computed(() => {
  if (!dateRange.value) return { dateRange1: null, dateRange2: null };
  const parts = String(dateRange.value).split(" to ");
  if (!parts[0]) return { dateRange1: null, dateRange2: null };
  const [sD, sM, sY] = parts[0].split("-").map(Number);
  const [eD, eM, eY] = (parts[1] || parts[0]).split("-").map(Number);
  if (![sD, sM, sY, eD, eM, eY].every(Number.isFinite)) {
    return { dateRange1: null, dateRange2: null };
  }
  return {
    dateRange1: new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime(),
    dateRange2: new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime(),
  };
});

const onDateClosed = (selectedDates, dateStr) => {
  if (selectedDates.length === 2) {
    dateRange.value = dateStr;
  }
};

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

const loadCohorts = async () => {
  try {
    const res = await cohortsStore.fetchCohorts({ paginate: false });
    cohortsStore.cohorts = res.data?.results || [];
  } catch (error) {
    cohortsStore.cohorts = [];
  }
};

onMounted(() => {
  loadBlocks();
  loadCohorts();
});
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
          <div class="d-flex gap-3 align-center flex-wrap">
            <VAutocomplete
              v-model="selectedCohort"
              :items="formattedCohortList"
              label="Cohort"
              variant="outlined"
              placeholder="Select cohort"
              density="compact"
              clearable
              hide-details
              style="min-width: 200px;"
            />
            <AppDateTimePicker
              v-model="dateRange"
              style="width: 280px"
              prepend-inner-icon="tabler-calendar"
              :config="{
                mode: 'range',
                dateFormat: 'd-m-Y',
                maxDate: tonight,
                onClose: onDateClosed,
                plugins: [customPlugin],
              }"
            />
            <VBtn color="primary" prepend-icon="tabler-plus" @click="goAdd">
              Add Block
            </VBtn>
          </div>
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
              Add your first block with a custom filter
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
            :date-range1="parsedDateRange.dateRange1"
            :date-range2="parsedDateRange.dateRange2"
            :timezone="timezone"
            :cohort-id="selectedCohort"
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
