<script setup>
import DashboardBlock from "@/app-pushapp/views/dashboards/custom/DashboardBlock.vue";
import { useCustomDashboardStore } from "@/app-pushapp/views/dashboards/custom/useCustomDashboardStore";
import { useCohortsStore } from "@app-pushapp/views/admin/cohorts/useCohortsStore";
import AppCombobox from "@/app-pushapp/@core/components/app-form-elements/AppCombobox.vue";
import AppDateTimePicker from "@/app-tikat/@core/components/app-form-elements/AppDateTimePicker.vue";
import { useDatePickerFilters } from "@app-tikat/views/dashboard/analytics/useDatePickerFilters";
import draggable from "vuedraggable";

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const recipients = ref([]);
const recipientsExist = ref(false);
const isRecipientsLoading = ref(false);
const isRecipientsDialogOpen = ref(false);
const isSavingRecipients = ref(false);
const draftRecipients = ref([]);

const selectedCohort = ref(null);
const tonight = new Date().setHours(23, 59, 59, 999);
const formatDate = (date) => date.toLocaleDateString("en-GB").split("/").join("-");
const today = new Date();
const dateRange = ref(`${formatDate(today)} to ${formatDate(today)}`);

const formattedCohortList = computed(() => {
  return (cohortsStore.cohorts || [])
    .map((c) => ({ title: c.name, value: c._id }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

const timezone =
  window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] ||
  "Asia/Kolkata";

const toStampRange = (value) => {
  const parts = String(value || "").split(" to ");
  const start = parts[0]?.trim();
  const end = (parts[1] || start)?.trim();
  if (!start || !end) return null;
  const [sD, sM, sY] = start.split("-").map(Number);
  const [eD, eM, eY] = end.split("-").map(Number);
  if (![sD, sM, sY, eD, eM, eY].every(Number.isFinite)) return null;
  return {
    dateRange1: new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime(),
    dateRange2: new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime(),
  };
};

const appliedDateRange = ref(toStampRange(dateRange.value));

const MAX_BLOCKS = 16;
const PAGE_SIZE = 12;
const page = ref(1);
const isAtBlockLimit = computed(() => blocks.value.length >= MAX_BLOCKS);
const pageCount = computed(() => Math.max(1, Math.ceil(blocks.value.length / PAGE_SIZE)));
const pageStart = computed(() => (page.value - 1) * PAGE_SIZE);
const gridRef = ref(null);
const isEdgeDrag = ref(false);
const heldCardId = ref(null);
const dropSlot = ref(0);
const heldX = ref(0);
const heldY = ref(0);
const slideName = ref("");
const dragSnapshot = ref([]);
const EDGE_PX = 56;
const EDGE_HOLD_MS = 380;

const replacePageSlice = (pageNumber, nextSlice) => {
  const start = (pageNumber - 1) * PAGE_SIZE;
  if (start < 0 || start >= blocks.value.length) return;
  const currentLength = Math.min(PAGE_SIZE, blocks.value.length - start);
  if (nextSlice.length !== currentLength) return;
  const next = blocks.value.slice();
  next.splice(start, currentLength, ...nextSlice);
  blocks.value = next;
};

const sliceForPage = (pageNumber) => {
  const start = (pageNumber - 1) * PAGE_SIZE;
  if (pageNumber < 1 || start >= blocks.value.length) return [];
  return blocks.value.slice(start, start + PAGE_SIZE);
};

const pagedBlocks = computed({
  get() {
    const slice = sliceForPage(page.value);
    if (!isEdgeDrag.value || !heldCardId.value) return slice;
    return slice.filter((block) => block._id !== heldCardId.value);
  },
  set(nextPage) {
    if (isEdgeDrag.value) return;
    replacePageSlice(page.value, nextPage);
  },
});

const heldCard = computed(
  () => dragSnapshot.value.find((block) => block._id === heldCardId.value) || null,
);

const onDateClosed = (selectedDates, dateStr) => {
  if (!selectedDates || selectedDates.length < 2) return;
  const parsed = toStampRange(dateStr);
  if (parsed) appliedDateRange.value = parsed;
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
    if (page.value > pageCount.value) page.value = pageCount.value;
    isLoading.value = false;
  }
};

const goAdd = () => {
  if (isAtBlockLimit.value) {
    show({ message: "You can add up to 16 blocks", color: "warning" });
    return;
  }
  router.push({ name: "dashboards-custom-add-id?" });
};

const onEdit = (item) => {
  router.push({ name: "dashboards-custom-add-id?", params: { id: item._id } });
};

const onDelete = (item) => {
  deleteTarget.value = item;
  isDeleteDialogOpen.value = true;
};

let pageBeforeDrag = 1;
let dragStartIndex = 0;
let edgeTimer = null;
let edgeDirection = 0;
let suppressSortableEnd = false;
let listenersAttached = false;
let edgeDropCommitted = false;

const clearEdgeTimer = () => {
  if (edgeTimer) clearTimeout(edgeTimer);
  edgeTimer = null;
  edgeDirection = 0;
};

const stopDragListeners = () => {
  if (!listenersAttached) return;
  window.removeEventListener("pointermove", onDragPointerMove, true);
  window.removeEventListener("mousemove", onDragPointerMove, true);
  window.removeEventListener("pointerup", onDragPointerUp, true);
  window.removeEventListener("mouseup", onDragPointerUp, true);
  listenersAttached = false;
  clearEdgeTimer();
};

const updateDropSlot = (event) => {
  const cols = [...(gridRef.value?.querySelectorAll(".dashboard-block-col") || [])];
  if (!cols.length) {
    dropSlot.value = 0;
    return;
  }
  let closest = 0;
  let best = Infinity;
  cols.forEach((col, index) => {
    const rect = col.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const dist = dx * dx + dy * dy;
    if (dist < best) {
      best = dist;
      closest = index;
    }
  });
  const rect = cols[closest].getBoundingClientRect();
  const after =
    event.clientX > rect.left + rect.width / 2 || event.clientY > rect.bottom;
  dropSlot.value = closest + (after ? 1 : 0);
};

const beginEdgeSlide = (direction) => {
  edgeTimer = null;
  edgeDirection = 0;
  const nextPage = page.value + direction;
  if (nextPage < 1 || nextPage > pageCount.value) return;
  if (!heldCardId.value) {
    const globalIndex = (pageBeforeDrag - 1) * PAGE_SIZE + dragStartIndex;
    const card = dragSnapshot.value[globalIndex];
    if (!card?._id) return;
    heldCardId.value = card._id;
  }
  suppressSortableEnd = true;
  isEdgeDrag.value = true;
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
  page.value = nextPage;
  slideName.value = "";
  nextTick(() => {
    slideName.value = direction > 0 ? "next" : "prev";
    updateDropSlot({ clientX: heldX.value, clientY: heldY.value });
  });
};

const scheduleEdge = (direction) => {
  if (edgeTimer && edgeDirection === direction) return;
  clearEdgeTimer();
  const nextPage = page.value + direction;
  if (nextPage < 1 || nextPage > pageCount.value) return;
  edgeDirection = direction;
  edgeTimer = setTimeout(() => beginEdgeSlide(direction), EDGE_HOLD_MS);
};

const onDragPointerMove = (event) => {
  heldX.value = event.clientX;
  heldY.value = event.clientY;
  if (isEdgeDrag.value) updateDropSlot(event);
  const rect = gridRef.value?.getBoundingClientRect();
  if (!rect) return;
  const nearGrid =
    event.clientY >= rect.top - 24 && event.clientY <= rect.bottom + 24;
  if (!nearGrid) {
    clearEdgeTimer();
    return;
  }
  if (event.clientX <= rect.left + EDGE_PX) scheduleEdge(-1);
  else if (event.clientX >= rect.right - EDGE_PX) scheduleEdge(1);
  else clearEdgeTimer();
};

const commitEdgeDrop = async () => {
  const snapshot = dragSnapshot.value.slice();
  const from = snapshot.findIndex((block) => block._id === heldCardId.value);
  if (from < 0) return;
  const next = snapshot.slice();
  const [moved] = next.splice(from, 1);
  const desired = (page.value - 1) * PAGE_SIZE + dropSlot.value;
  const insertAt = Math.min(Math.max(desired, 0), next.length);
  next.splice(insertAt, 0, moved);
  blocks.value = next;
  const landed = Math.max(next.indexOf(moved), 0);
  page.value = Math.floor(landed / PAGE_SIZE) + 1;
  try {
    await store.reorderDashboards(next.map((block) => block._id));
  } catch (error) {
    blocks.value = snapshot;
    page.value = pageBeforeDrag;
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Failed to save block order",
      color: "error",
    });
  }
};

const onDragPointerUp = async (event) => {
  if (event?.isTrusted === false) return;
  clearEdgeTimer();
  if (isEdgeDrag.value && !edgeDropCommitted) {
    edgeDropCommitted = true;
    await commitEdgeDrop();
  }
  isEdgeDrag.value = false;
  heldCardId.value = null;
  slideName.value = "";
  stopDragListeners();
};

const onDragStart = (evt) => {
  dragSnapshot.value = blocks.value.slice();
  pageBeforeDrag = page.value;
  dragStartIndex = evt?.oldIndex ?? 0;
  suppressSortableEnd = false;
  edgeDropCommitted = false;
  isEdgeDrag.value = false;
  heldCardId.value = null;
  slideName.value = "";
  if (!listenersAttached) {
    window.addEventListener("pointermove", onDragPointerMove, true);
    window.addEventListener("mousemove", onDragPointerMove, true);
    window.addEventListener("pointerup", onDragPointerUp, true);
    window.addEventListener("mouseup", onDragPointerUp, true);
    listenersAttached = true;
  }
};

const onDragEnd = async ({ oldIndex, newIndex }) => {
  if (suppressSortableEnd || isEdgeDrag.value) return;
  stopDragListeners();
  if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
  try {
    await store.reorderDashboards(blocks.value.map((block) => block._id));
  } catch (error) {
    blocks.value = dragSnapshot.value.slice();
    page.value = pageBeforeDrag;
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Failed to save block order",
      color: "error",
    });
  }
};

onBeforeUnmount(stopDragListeners);

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

const normalizeEmails = (values) => {
  const seen = new Set();
  const emails = [];
  for (const value of values || []) {
    const raw = value && typeof value === "object" ? value.value ?? value.title ?? "" : value;
    for (const part of String(raw).split(/[,;\s]+/)) {
      const email = part.trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      emails.push(email);
    }
  }
  return emails;
};

const applyRecipientsPayload = (data) => {
  recipients.value = Array.isArray(data?.users) ? data.users : [];
  recipientsExist.value = Boolean(data?._id || data?.id || recipients.value.length);
};

const loadRecipients = async () => {
  isRecipientsLoading.value = true;
  try {
    const res = await store.fetchEmailRecipients();
    applyRecipientsPayload(res?.data?.data);
  } catch (error) {
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Failed to load email recipients",
      color: "error",
    });
    recipients.value = [];
    recipientsExist.value = false;
  } finally {
    isRecipientsLoading.value = false;
  }
};

const openRecipientsDialog = () => {
  draftRecipients.value = [...recipients.value];
  isRecipientsDialogOpen.value = true;
};

const saveRecipients = async () => {
  const normalized = normalizeEmails(draftRecipients.value);
  const invalid = normalized.find((email) => !EMAIL_PATTERN.test(email));
  if (invalid) {
    show({ message: `Invalid email: ${invalid}`, color: "error" });
    return;
  }
  if (!normalized.length && !recipientsExist.value) {
    show({ message: "Add at least one email address", color: "warning" });
    return;
  }

  isSavingRecipients.value = true;
  try {
    if (!normalized.length) {
      await store.deleteEmailRecipients();
      recipients.value = [];
      recipientsExist.value = false;
      show({ message: "Email recipients cleared", color: "success" });
    } else if (!recipientsExist.value) {
      let res;
      try {
        res = await store.createEmailRecipients(normalized);
      } catch (error) {
        if (error.response?.status !== 409) throw error;
        res = await store.updateEmailRecipients(normalized);
      }
      recipients.value = res?.data?.data?.users || normalized;
      recipientsExist.value = true;
      show({ message: "Email recipients saved", color: "success" });
    } else {
      const res = await store.updateEmailRecipients(normalized);
      recipients.value = res?.data?.data?.users || normalized;
      recipientsExist.value = true;
      show({ message: "Email recipients saved", color: "success" });
    }
    draftRecipients.value = [...recipients.value];
    isRecipientsDialogOpen.value = false;
  } catch (error) {
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Failed to save email recipients",
      color: "error",
    });
  } finally {
    isSavingRecipients.value = false;
  }
};

onMounted(() => {
  loadBlocks();
  loadCohorts();
  loadRecipients();
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
            <VBtn color="primary" prepend-icon="tabler-plus" :disabled="isAtBlockLimit" @click="goAdd">
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

        <VCol v-else cols="12">
          <div
            ref="gridRef"
            class="dashboard-grid"
            :class="{
              'dashboard-grid--slide-next': slideName === 'next',
              'dashboard-grid--slide-prev': slideName === 'prev',
            }"
          >
            <draggable
              v-model="pagedBlocks"
              item-key="_id"
              class="v-row"
              filter=".dashboard-block__actions"
              :prevent-on-filter="false"
              :animation="200"
              :disabled="isEdgeDrag"
              :force-fallback="true"
              :fallback-on-body="true"
              ghost-class="dashboard-block-ghost"
              @start="onDragStart"
              @end="onDragEnd"
            >
              <template #item="{ element: item, index: idx }">
                <VCol
                  cols="12"
                  sm="6"
                  md="4"
                  lg="3"
                  class="dashboard-block-col"
                  :class="{ 'dashboard-block-col--drop': isEdgeDrag && idx === dropSlot }"
                >
                  <DashboardBlock
                    :item="item"
                    :color-index="pageStart + idx"
                    :date-range1="appliedDateRange.dateRange1"
                    :date-range2="appliedDateRange.dateRange2"
                    :timezone="timezone"
                    :cohort-id="selectedCohort"
                    @edit="onEdit"
                    @delete="onDelete"
                  />
                </VCol>
              </template>
            </draggable>
          </div>
          <div v-if="pageCount > 1" class="d-flex justify-center mt-4">
            <VPagination v-model="page" :length="pageCount" />
          </div>
        </VCol>
      </template>

      <VCol cols="12" class="mt-2">
        <VCard variant="outlined">
          <VCardItem>
            <VCardTitle>Email recipients</VCardTitle>
            <VCardSubtitle>
              These addresses get the daily management dashboard email at 6 AM.
            </VCardSubtitle>
            <template #append>
              <VBtn
                color="primary"
                variant="tonal"
                :prepend-icon="recipientsExist ? 'tabler-pencil' : 'tabler-plus'"
                @click="openRecipientsDialog"
              >
                {{ recipientsExist ? "Edit" : "Add" }}
              </VBtn>
            </template>
          </VCardItem>
          <VCardText>
            <VProgressCircular
              v-if="isRecipientsLoading"
              indeterminate
              color="primary"
              size="24"
            />
            <p
              v-else-if="!recipients.length"
              class="text-body-2 text-medium-emphasis mb-0"
            >
              No recipients yet
            </p>
            <div v-else class="d-flex flex-wrap gap-2">
              <VChip
                v-for="email in recipients"
                :key="email"
                size="small"
                label
              >
                {{ email }}
              </VChip>
            </div>
          </VCardText>
        </VCard>
      </VCol>
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

    <VDialog v-model="isRecipientsDialogOpen" max-width="520">
      <VCard>
        <VCardTitle>Email recipients</VCardTitle>
        <VCardText class="pt-0">
          <AppCombobox
            v-model="draftRecipients"
            placeholder="Type an email and press Enter"
            multiple
            chips
            closable-chips
            hide-no-data
            :items="[]"
            :delimiters="[',', ';', ' ']"
            hide-details
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            color="secondary"
            :disabled="isSavingRecipients"
            @click="isRecipientsDialogOpen = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            variant="flat"
            :loading="isSavingRecipients"
            @click="saveRecipients"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <div
      v-if="isEdgeDrag && heldCard"
      class="dashboard-held-card"
      :style="{ left: `${heldX}px`, top: `${heldY}px` }"
    >
      {{ heldCard.title }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-block-col {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.dashboard-block-ghost {
  opacity: 0.4;
}

.dashboard-block-col--drop {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
  border-radius: 8px;
}

.dashboard-grid--slide-next {
  animation: dashboard-slide-next 0.22s ease;
}

.dashboard-grid--slide-prev {
  animation: dashboard-slide-prev 0.22s ease;
}

.dashboard-held-card {
  position: fixed;
  z-index: 3000;
  pointer-events: none;
  transform: translate(-50%, -60%);
  padding: 10px 14px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  font-size: 0.875rem;
  max-width: 180px;
}

@keyframes dashboard-slide-next {
  from {
    opacity: 0.55;
    transform: translateX(28px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes dashboard-slide-prev {
  from {
    opacity: 0.55;
    transform: translateX(-28px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
