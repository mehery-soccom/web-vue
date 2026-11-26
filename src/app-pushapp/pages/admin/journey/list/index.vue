<script setup>
import debounce from "lodash/debounce";
import { useFlowsStore } from "@app-pushapp/views/admin/journeys/useFlowsStore";
import {
  extractKinds,
  isBroadcastKind,
  journeyTimezone,
  resolveKind,
} from "@app-pushapp/views/admin/journeys/journeyKind";
import { useRoute, useRouter } from "vue-router";
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
const { show } = inject("snackbar");

const FlowsStore = useFlowsStore();
const isLoading = ref(false);
const route = useRoute();
const router = useRouter();
const items = ref([]);
const kinds = ref([]);
const selectedKind = ref(null);
const createDialog = ref(false);
const createKind = ref(null);
const scheduleDialog = ref(false);
const scheduleTargetId = ref(null);
const scheduleRunAt = ref(null);
const schedulePickerConfig = ref({
  enableTime: true,
  minDate: new Date(),
  time_24hr: true,
});
const confirmDialog = ref(false);
const confirmText = ref("");
let confirmAction = null;

const statusFilterOptions = computed(() => {
  const options = [
    { title: "Draft", value: "DRAFT" },
    { title: "Live", value: "ON_GOING" },
    { title: "Paused", value: "PAUSED" },
    { title: "Terminated", value: "ENDED" },
  ];
  if (isBroadcastKind(selectedKind.value)) {
    options.splice(1, 0, { title: "Scheduled", value: "SCHEDULED" });
  }
  return options;
});

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
    filterOptions: statusFilterOptions.value,
  },
  {
    title: "Time",
    key: "audit",
    align: "center",
    sortable: false,
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

const fetchItems = async (params) => {
  if (!selectedKind.value) return;
  try {
    isLoading.value = true;

    const response = await FlowsStore.fetchFlows({
      ...params,
      kind: selectedKind.value,
    });
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
  const kind = resolveKind(record.kind);
  FlowsStore.setCloneData({
    kind,
    audienceMode: record.audienceMode,
    filter: record.filter,
    flow: record.flow,
    flowRenderer: record.flowRenderer,
  });
  router.push({ name: "admin-journey-add-id?", query: { kind } });
};

const statusSuccessMessage = (status) => {
  if (!isBroadcastKind(selectedKind.value)) {
    return `Flow ${status === "ON_GOING" ? "started" : "paused"} successfully`;
  }
  if (status === "ON_GOING") return "Journey started";
  if (status === "PAUSED") return "Journey paused";
  if (status === "SCHEDULED") return "Journey scheduled";
  if (status === "DRAFT") return "Scheduled start cancelled";
  if (status === "ENDED") return "Journey ended";
  return "Journey updated";
};

const requestErrorMessage = (error) => {
  const data = error?.response?.data;
  return data?.error?.message || data?.message || "Something went wrong";
};

const updateFlowStatus = (id, status, extra = {}) => {
  isLoading.value = true;

  FlowsStore.updateFlow({ id, status, ...extra })
    .then(() => {
      fetchItems({ ...pagination });
      show({
        message: statusSuccessMessage(status),
        color: "success",
      });
    })
    .catch((error) => {
      show({
        message: requestErrorMessage(error),
        color: "error",
      });
    })
    .finally(() => {
      isLoading.value = false;
    });
};

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

const openCreate = () => {
  createKind.value = selectedKind.value || kinds.value[0]?.kind || null;
  createDialog.value = true;
};

const confirmCreate = () => {
  if (!createKind.value) return;
  createDialog.value = false;
  router.push({
    name: "admin-journey-add-id?",
    query: { kind: createKind.value },
  });
};

const openSchedule = (id) => {
  scheduleTargetId.value = id;
  scheduleRunAt.value = null;
  schedulePickerConfig.value = {
    enableTime: true,
    minDate: new Date(),
    time_24hr: true,
  };
  scheduleDialog.value = true;
};

const parseScheduleRunAt = (value) => {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return new Date(value);
  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
};

const confirmSchedule = () => {
  const runAtDate = parseScheduleRunAt(scheduleRunAt.value);
  if (!scheduleRunAt.value || Number.isNaN(runAtDate.getTime()) || runAtDate.getTime() <= Date.now()) {
    show({ message: "Choose a start time in the future", color: "error" });
    return;
  }
  const id = scheduleTargetId.value;
  scheduleDialog.value = false;
  updateFlowStatus(id, "SCHEDULED", {
    schedule: {
      runAt: runAtDate.toISOString(),
      timezone: journeyTimezone(),
    },
  });
};

const askConfirm = (text, action) => {
  confirmText.value = text;
  confirmAction = action;
  confirmDialog.value = true;
};

const runConfirm = () => {
  const action = confirmAction;
  confirmDialog.value = false;
  confirmAction = null;
  action?.();
};

const statusLabel = (status, resumed) => {
  if (status === "ON_GOING") return resumed ? "Resumed" : "Journey Start";
  if (status === "PAUSED") return "Paused";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "ENDED") return "Terminated";
  return status;
};

const statusRows = (item) => {
  const rows = [
    {
      label: "Created",
      byLabel: "Created by",
      stamp: item?.createTime?.stamp,
      byUser: item?.createTime?.byUser,
    },
    {
      label: "Updated",
      byLabel: "Updated by",
      stamp: item?.updateTime?.stamp,
      byUser: item?.updateTime?.byUser,
    },
  ];

  const currentStatus = String(item?.status || "").toUpperCase();
  let started = false;
  let latestSchedule = null;
  for (const entry of item?.statusHistory || []) {
    const status = String(entry?.status || "").toUpperCase();
    if (!status || status === "DRAFT") continue;
    if (status === "SCHEDULED") {
      latestSchedule = entry;
      continue;
    }
    const isFirstStart = status === "ON_GOING" && !started;
    if (status === "ON_GOING") started = true;
    if (isFirstStart) continue;
    rows.push({
      label: statusLabel(status, status === "ON_GOING"),
      byLabel: "By",
      stamp: entry?.time?.stamp,
      byUser: entry?.time?.byUser,
    });
  }

  if (currentStatus === "SCHEDULED" && (item?.schedule?.runAt || latestSchedule)) {
    rows.push({
      label: item?.schedule?.runAt ? "Scheduled for" : "Scheduled",
      byLabel: "By",
      stamp: item?.schedule?.runAt || latestSchedule?.time?.stamp,
      byUser: latestSchedule?.time?.byUser,
    });
  }

  return rows;
};

const statusChipLabel = (status) => ({
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ON_GOING: "Live",
  PAUSED: "Paused",
  ENDED: "Terminated",
}[status] || status);

const statusChipColor = (status) => ({
  DRAFT: "secondary",
  SCHEDULED: "info",
  ON_GOING: "success",
  PAUSED: "warning",
  ENDED: "error",
}[status]);

onMounted(async () => {
  try {
    const response = await FlowsStore.fetchKinds();
    kinds.value = extractKinds(response);
    if (!kinds.value.length) {
      show({ message: "Failed to load journey kinds", color: "error" });
      return;
    }
    const requested = String(route.query.kind || "").toUpperCase();
    selectedKind.value = kinds.value.some((item) => item.kind === requested)
      ? requested
      : kinds.value[0].kind;
  } catch (error) {
    console.error(error);
    show({ message: "Failed to load journey kinds", color: "error" });
  }
});
</script>

<template>
  <div>
  <VCard>
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <VTabs
        v-if="kinds.length"
        v-model="selectedKind"
        class="journey-kind-tabs"
        height="40"
      >
        <VTab v-for="kind in kinds" :key="kind.kind" :value="kind.kind">
          {{ kind.labelPlural }}
        </VTab>
      </VTabs>

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
        <VBtn
          prepend-icon="tabler-plus"
          :disabled="!kinds.length"
          @click="openCreate"
        >
          New
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable
      v-if="selectedKind"
      :key="selectedKind"
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
        <VChip
          :color="statusChipColor(item.raw.status)"
          variant="tonal"
          size="small"
        >
          {{ statusChipLabel(item.raw.status) }}
        </VChip>
      </template>

      <template #item.audit="{ item }">
        <IconBtn>
          <VIcon icon="tabler-clock-filled" size="16" />
          <VTooltip activator="parent" open-delay="1000" scroll-strategy="close">
            <div class="py-1">
              <div v-for="(row, index) in statusRows(item.raw)" :key="index">
                <strong>{{ row.label }}:</strong>
                {{ row.stamp ? smartFormatDate(row.stamp) : "-" }}
                <div v-if="row.byUser">
                  <strong>{{ row.byLabel }}: </strong>{{ row.byUser }}
                </div>
              </div>
            </div>
          </VTooltip>
        </IconBtn>
      </template>

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
          v-if="item.raw.status !== 'DRAFT' && item.raw.status !== 'SCHEDULED'"
          :to="{
            name: 'admin-journey-add-id?',
            params: { id: item.raw._id },
            query: { analytics: 'true' },
          }"
        >
          <VIcon icon="tabler-chart-bar" />
          <VTooltip activator="parent">View Analytics</VTooltip>
        </IconBtn>

        <template v-if="isBroadcastKind(item.raw.kind)">
          <IconBtn
            v-if="item.raw.status === 'DRAFT'"
            @click="updateFlowStatus(item.raw._id, 'ON_GOING')"
          >
            <VIcon icon="mdi-rocket-launch" />
            <VTooltip activator="parent">Start now</VTooltip>
          </IconBtn>
          <IconBtn
            v-if="item.raw.status === 'DRAFT'"
            @click="openSchedule(item.raw._id)"
          >
            <VIcon icon="mdi-calendar-clock" />
            <VTooltip activator="parent">Schedule</VTooltip>
          </IconBtn>
          <IconBtn
            v-if="item.raw.status === 'SCHEDULED'"
            @click="updateFlowStatus(item.raw._id, 'DRAFT', { schedule: null })"
          >
            <VIcon icon="mdi-calendar-remove" />
            <VTooltip activator="parent">Cancel start</VTooltip>
          </IconBtn>
          <IconBtn
            v-if="item.raw.status === 'DRAFT'"
            :to="{
              name: 'admin-journey-add-id?',
              params: { id: item.raw._id },
              query: { edit: null },
            }"
          >
            <VIcon icon="mdi-pencil-outline" />
            <VTooltip activator="parent">Edit Flow</VTooltip>
          </IconBtn>
          <IconBtn
            v-if="item.raw.status === 'ON_GOING'"
            @click="updateFlowStatus(item.raw._id, 'PAUSED')"
          >
            <VIcon icon="mdi-pause" />
            <VTooltip activator="parent">Pause</VTooltip>
          </IconBtn>
          <IconBtn
            v-if="item.raw.status === 'PAUSED'"
            @click="updateFlowStatus(item.raw._id, 'ON_GOING')"
          >
            <VIcon icon="mdi-play-circle" />
            <VTooltip activator="parent">Resume</VTooltip>
          </IconBtn>
          <IconBtn
            v-if="item.raw.status === 'ON_GOING' || item.raw.status === 'SCHEDULED'"
            @click="askConfirm('End this journey?', () => updateFlowStatus(item.raw._id, 'ENDED'))"
          >
            <VIcon icon="mdi-close-circle" />
            <VTooltip activator="parent">End</VTooltip>
          </IconBtn>
        </template>

        <template v-else>
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

        <IconBtn @click="cloneItem(item.raw)">
          <VIcon icon="mdi-content-copy" />
          <VTooltip activator="parent">Clone Flow</VTooltip>
        </IconBtn>
      </template>
    </MyDataTable>
  </VCard>

  <VDialog v-model="createDialog" max-width="420">
    <VCard>
      <VCardTitle>New journey</VCardTitle>
      <VCardText>
        <VRadioGroup v-model="createKind">
          <VRadio
            v-for="kind in kinds"
            :key="kind.kind"
            :value="kind.kind"
            :label="kind.label"
          />
        </VRadioGroup>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="createDialog = false">Cancel</VBtn>
        <VBtn color="primary" :disabled="!createKind" @click="confirmCreate">Continue</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog
    v-model="scheduleDialog"
    max-width="440"
    persistent
    no-click-animation
    :retain-focus="false"
  >
    <VCard>
      <VCardTitle>Schedule start</VCardTitle>
      <VCardText>
        <AppDateTimePicker
          v-model="scheduleRunAt"
          placeholder="Select date and time"
          :config="schedulePickerConfig"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="scheduleDialog = false">Cancel</VBtn>
        <VBtn color="primary" :disabled="!scheduleRunAt" @click="confirmSchedule">Schedule</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="confirmDialog" max-width="350">
    <VCard prepend-icon="mdi-alert" :text="confirmText" title="Confirm">
      <template #actions>
        <VBtn class="ml-auto" @click="runConfirm">Yes</VBtn>
        <VBtn class="ml-auto" @click="confirmDialog = false">No</VBtn>
      </template>
    </VCard>
  </VDialog>
  </div>
</template>

<style>
.v-card .journey-kind-tabs.v-tabs.v-tabs--horizontal {
  flex: 0 1 auto;
  border-block-end: none;
}
.journey-kind-tabs .v-slide-group__content {
  gap: 4px;
}
.journey-kind-tabs .v-tab.v-btn {
  border-radius: 8px;
  min-width: 0;
  padding-inline: 14px;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-transform: none;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.journey-kind-tabs .v-tab__slider {
  display: none;
}
.journey-kind-tabs .v-tab--selected {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}
.desc-cell {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0 auto;
}
</style>
