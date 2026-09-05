<script setup>
import FlowEditor from "@/app-pushapp/views/admin/journeys/Floweditor.vue";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";
import { useFlowsStore } from "@/app-pushapp/views/admin/journeys/useFlowsStore";
import { toPng } from "html-to-image";
import * as XLSX from "xlsx";

const FlowsStore = useFlowsStore();
const route = useRoute();
const router = useRouter();
const { show } = inject("snackbar");
const isLoading = ref(false);
const isFetching = ref(false);
const flowRecord = ref(null);
const isViewMode = computed(() => !!route.params.id);
const isEditing = computed(() => "edit" in route.query);
const isAnalyticsMode = computed(() => route.query.analytics === "true");

// ── Analytics ──────────────────────────────────────────────────────────────
const analyticsData = ref(null);
const analyticsLoading = ref(false);

const formatAnalyticsDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const defaultAnalyticsFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d;
};
const analyticsDateRange = ref(
  `${formatAnalyticsDate(defaultAnalyticsFrom())} to ${formatAnalyticsDate(new Date())}`,
);

const parseYmd = (value) => {
  if (value instanceof Date) return new Date(value);
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const startOfDayTs = (value) => {
  const d = parseYmd(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const endOfDayTs = (value) => {
  const d = parseYmd(value);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

const parseAnalyticsRange = (selectedDates) => {
  if (Array.isArray(selectedDates) && selectedDates.length === 2) {
    return {
      from: startOfDayTs(selectedDates[0]),
      to: endOfDayTs(selectedDates[1]),
    };
  }
  const [from, to] = String(analyticsDateRange.value || "")
    .split(" to ").map((part) => part.trim()).filter(Boolean);
  if (!from || !to) return {};
  return { from: startOfDayTs(from), to: endOfDayTs(to) };
};

const ANALYTICS_STATS = [
  { key: "uniqueProfiles",   label: "Users",        icon: "tabler-users",       color: "info"     },
  { key: "totalTrips",       label: "Total Trips",  icon: "tabler-route",       color: "primary"  },
  { key: "runningTrips",     label: "Active",       icon: "tabler-player-play", color: "warning"  },
  { key: "completedTrips",   label: "Completed",    icon: "tabler-checks",      color: "success"  },
  { key: "completedSuccess", label: "Success",      icon: "tabler-mood-smile",  color: "success"  },
  { key: "completedFailure", label: "Failed",       icon: "tabler-mood-sad",    color: "error"    },
];

const analyticsNodesMap = computed(() => {
  const map = {};
  for (const n of analyticsData.value?.nodes || []) {
    map[n.nodeId] = n;
  }
  return map;
});

async function loadAnalytics(id, selectedDates) {
  try {
    analyticsLoading.value = true;
    const { from, to } = parseAnalyticsRange(selectedDates);
    const res = await FlowsStore.fetchFlowAnalytics({ id, from, to });
    analyticsData.value = res.data.data;
  } catch (e) {
    console.error("[Analytics] failed to load", e);
    show({ message: "Failed to load analytics", color: "error" });
  } finally {
    analyticsLoading.value = false;
  }
}

function onAnalyticsDateClosed(selectedDates) {
  if (selectedDates.length !== 2) return;
  if (route.params.id) loadAnalytics(route.params.id, selectedDates);
}

const analyticsSummaryExportRef = ref(null);
const isCapturingSummary = ref(false);

const getJourneyDisplayName = () => (flow.name || flowRecord.value?.name || "journey").trim();
const sanitizeFilePart = (value) => String(value).replace(/[^\w-]+/g, "_").replace(/_+/g, "_");

const getAnalyticsDateFilePart = () => {
  const parts = String(analyticsDateRange.value || "")
    .split(" to ").map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2 && parts[0] !== parts[1]) {
    return `${parts[0]}-${parts[1]}`;
  }
  return parts[0] || formatAnalyticsDate(new Date());
};

const getAnalyticsFileBaseName = () =>
  `JA_${sanitizeFilePart(getJourneyDisplayName())}_${getAnalyticsDateFilePart()}`;

const triggerFileDownload = (href, fileName) => {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = href;
  link.click();
};

const captureElementAsPng = async (el) => {
  const opts = { cacheBust: true, backgroundColor: "#ffffff", pixelRatio: 2, skipFonts: true };
  await toPng(el, opts);
  return toPng(el, opts);
};

const downloadSummaryImage = async () => {
  if (!analyticsSummaryExportRef.value) return;

  const baseName = getAnalyticsFileBaseName();
  isCapturingSummary.value = true;
  await nextTick();

  try {
    const dataUrl = await captureElementAsPng(analyticsSummaryExportRef.value);
    triggerFileDownload(dataUrl, `${baseName}.png`);
  } catch (error) {
    console.error("[Analytics] summary image capture failed", error);
    show({ message: "Failed to download summary image", color: "error" });
  } finally {
    isCapturingSummary.value = false;
  }
};

const downloadFlowImage = async () => {
  try {
    const dataUrl = await flowEditorRef.value?.captureFlowScreenshot?.();
    if (!dataUrl) {
      show({ message: "Flow canvas is not ready yet", color: "warning" });
      return;
    }
    triggerFileDownload(dataUrl, `${getAnalyticsFileBaseName()}_flow.png`);
  } catch (error) {
    console.error("[Analytics] flow image capture failed", error);
    show({ message: "Failed to download flow image", color: "error" });
  }
};

const exportAnalyticsToExcel = () => {
  if (!analyticsData.value?.summary) return;

  const summary = analyticsData.value.summary;
  const dateParts = String(analyticsDateRange.value || "")
    .split(" to ")
    .map((part) => part.trim())
    .filter(Boolean);

  const row = {
    Journey: getJourneyDisplayName(),
    "Date From": dateParts[0] || "",
    "Date To": dateParts[1] || dateParts[0] || "",
  };

  ANALYTICS_STATS.forEach((stat) => {
    row[stat.label] = summary[stat.key] ?? "—";
  });

  const worksheet = XLSX.utils.json_to_sheet([row]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Journey Summary");
  XLSX.writeFile(workbook, `${getAnalyticsFileBaseName()}.xlsx`);
};
const audienceMode = ref("filter");
const isSyncingAudienceMode = ref(false);

const createInitialJourneyFilter = () => ({
  type: "group",
  conjunction: "and",
  children: [
    {
      _id: crypto.randomUUID(),
      type: "filter",
      filterType: null,
      field: null,
      operator: null,
      value: null,
      freqOperator: null,
      freqCount: null,
      freqPeriod: null,
      scannedEvents: null,
    },
  ],
});

const flow = reactive({
  name: "",
  desc: "",
  filter: createInitialJourneyFilter(),
  flow: {},
  flowRenderer: {
    drawflow: {
      Home: {},
    },
  },
});

const tabs = [
  {
    title: "Audience",
    icon: "tabler-users",
  },
  {
    title: "Flow",
    icon: "mdi-vector-polyline",
  },
];

const activeTab = ref(0);

const nextTab = computed(() => {
  const next = tabs[activeTab.value + 1];
  return next ? `Proceed to ${next.title}` : null;
});

const tabErrors = ref({
  0: false,
  1: false,
});

const errors = ref({});
const filterRef = ref();
const flowEditorRef = ref();

const resetJourneyFilter = () => {
  const initialFilter = createInitialJourneyFilter();
  flow.filter.type = initialFilter.type;
  flow.filter.conjunction = initialFilter.conjunction;
  flow.filter.children.splice(0, flow.filter.children.length, ...initialFilter.children);
};

const collectFilterTypes = (node, types = []) => {
  if (!node) return types;
  if (node.type === "filter") types.push(node.filterType);
  if (Array.isArray(node.children))
    node.children.forEach((child) => collectFilterTypes(child, types));
  return types;
};

const getAudienceModeFromFilter = (filterNode) => {
  const selectedTypes = collectFilterTypes(filterNode).filter(Boolean);
  if (selectedTypes.length && selectedTypes.every((type) => type === "cohort")) {
    return "cohort";
  }
  return "filter";
};

const clearError = (field) => {
  errors.value[field] = null;
};

watch(audienceMode, (newMode, oldMode) => {
  if (isSyncingAudienceMode.value || newMode === oldMode) return;

  const switchedBetweenAudienceModes =
    (oldMode === "cohort" && newMode === "filter") ||
    (oldMode === "filter" && newMode === "cohort");

  if (switchedBetweenAudienceModes) resetJourneyFilter();
});

const isValidTab = async (tab, silent = false) => {
  let valid = true;

  switch (tab) {
    case 0: {
      const filterValid = await filterRef.value?.isValid();
      let filterStructureValid = true;
      try {
        validateFilterStructure(flow.filter, null, true, true, true, false);
      } catch (error) {
        filterStructureValid = false;
        if (!silent) show({ message: error.message, color: "error" });
      }

      if (!filterValid || !filterStructureValid) valid = false;
      break;
    }
    default:
      break;
  }

  if (!silent) tabErrors.value[tab] = !valid;
  return valid;
};

const isValid = async (silent = false) => {
  const tabResults = await Promise.allSettled(
    tabs.map((_, i) => isValidTab(i, silent)),
  );

  const tabsValid = tabResults.every((r) => !!r.value);
  const e = {};
  if (!flow.name) e.name = true;
  if (!silent) errors.value = e;

  return !Object.keys(e).length && tabsValid;
};

const proceedToNextTab = async () => {
  const valid = await isValidTab(activeTab.value);
  if (valid) activeTab.value++;
};

async function launchFlow() {
  try {
    isLoading.value = true;
    const valid = await isValid();
    if (!valid) return;

    const flowValidation = flowEditorRef.value?.validateFlow();
    if (!flowValidation?.valid) {
      tabErrors.value[1] = true;
      activeTab.value = 1;
      const summary = flowValidation.errors
        .map((e) => `${e.label}: ${e.messages.join(", ")}`)
        .join(" • ");
      show({
        message: `Fix the highlighted nodes — ${summary}`,
        color: "error",
      });
      return;
    }
    tabErrors.value[1] = false;

    const editorPayload = flowEditorRef.value.buildFlowPayload();
    const payload = {
      name: flow.name,
      desc: flow.desc,
      filter: flow.filter,
      ...editorPayload,
    };

    if (route.params.id) {
      await FlowsStore.editFlow({ id: route.params.id, ...payload });
      show({ message: "Flow updated successfully", color: "success" });
    } else {
      await FlowsStore.createFlow(payload);
      show({ message: "Flow saved successfully", color: "success" });
    }
    router.push({ name: "admin-journey-list" });
  } catch (e) {
    console.log(e);
    if (
      e.response?.status === 409 &&
      e.response?.data?.error?.code === "DUPLICATE_RESOURCE"
    ) {
      show({
        message: "Flow with the same name already exists",
        color: "error",
      });
    } else {
      show({ message: "Failed to save flow", color: "error" });
    }
  } finally {
    isLoading.value = false;
  }
}
function ensureFilterIds(node) {
  if (!node) return node;
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      if (!child._id) child._id = crypto.randomUUID();
      ensureFilterIds(child);
    });
  }
  return node;
}

async function loadRecordIntoForm(record) {
  if (!record) return;
  flow.name = record.name || "";
  flow.desc = record.desc || "";
  flow.flow = record.flow || {};
  flow.flowRenderer = record.flowRenderer || { drawflow: { Home: {} } };
  if (record.filter) {
    const cloned = ensureFilterIds(structuredClone(record.filter));
    Object.assign(flow.filter, cloned);
    isSyncingAudienceMode.value = true;
    audienceMode.value = getAudienceModeFromFilter(cloned);
    await nextTick();
    isSyncingAudienceMode.value = false;
  }
}

async function loadCloneIntoForm(data) {
  flow.flow = data.flow || {};
  flow.flowRenderer = data.flowRenderer || { drawflow: { Home: {} } };
  if (data.filter) {
    const cloned = ensureFilterIds(structuredClone(data.filter));
    Object.assign(flow.filter, cloned);
    isSyncingAudienceMode.value = true;
    audienceMode.value = getAudienceModeFromFilter(cloned);
    await nextTick();
    isSyncingAudienceMode.value = false;
  }
}

onMounted(async () => {
  if (route.params.id) {
    try {
      isFetching.value = true;
      if (isAnalyticsMode.value) {
        activeTab.value = 1;
        analyticsLoading.value = true;
      }
      const response = await FlowsStore.fetchFlow({ id: route.params.id });
      flowRecord.value = response.data.data;
      await loadRecordIntoForm(flowRecord.value);
      await nextTick();
    } catch (e) {
      console.log(e);
      show({ message: "Failed to load flow", color: "error" });
    } finally {
      isFetching.value = false;
    }
    if (isAnalyticsMode.value) {
      loadAnalytics(route.params.id);
    }
    return;
  }
  const cloneData = FlowsStore.consumeCloneData();
  if (cloneData) {
    flowRecord.value = cloneData;
    await loadCloneIntoForm(cloneData);
    show({
      message: "Cloned flow loaded — set a new name to save",
      color: "info",
    });
    // if (!route.params.id) return;
    // try {
    //   isFetching.value = true;
    //   const response = await FlowsStore.fetchFlow({ id: route.params.id });
    //   flowRecord.value = response.data.data;
    //   // console.log("data", JSON.parse(JSON.stringify(flowRecord.value)));
    //   await loadRecordIntoForm(flowRecord.value);
    // } catch (e) {
    //   console.log(e);
    //   show({ message: "Failed to load flow", color: "error" });
    // } finally {
    //   isFetching.value = false;
  }
});
</script>

<template>
  <div>
    <VToolbar
      flat
      class="px-4 mb-4 v-card--variant-elevated"
      style="background: rgb(var(--v-theme-surface))"
    >
      <!-- Left -->
      <div class="d-flex align-center flex-shrink-0">
        <VIcon size="28" class="mr-3" color="primary">
          mdi-vector-polyline
        </VIcon>

        <VRow style="min-width: 700px">
          <VCol cols="4">
            <AppTextField
              v-model="flow.name"
              placeholder="Untitled Flow"
              :error="!!errors.name"
              @update:model-value="clearError('name')"
              :disabled="isViewMode"
            />
          </VCol>

          <VCol cols="8">
            <AppTextField
              v-model="flow.desc"
              placeholder="Description"
              :disabled="isViewMode && !isEditing"
            />
          </VCol>
        </VRow>
      </div>

      <!-- Right -->
      <div class="d-flex align-center gap-2 ml-auto">
        <VBtn
          variant="tonal"
          color="secondary"
          :to="{ name: 'admin-journey-list' }"
        >
          Exit
        </VBtn>

        <VBtn v-if="nextTab" color="primary" @click="proceedToNextTab">
          {{ nextTab }}
          <VIcon end icon="mdi-arrow-right" />
        </VBtn>

        <VBtn
          v-else
          color="success"
          :loading="isLoading"
          v-if="!isViewMode || isEditing"
          @click="launchFlow"
        >
          Save Flow
          <VIcon end icon="mdi-check" />
        </VBtn>
      </div>
    </VToolbar>

    <!-- Tabs -->
    <VTabs v-model="activeTab" class="v-tabs-pill">
      <VTab
        v-for="(item, index) in tabs"
        :key="item.icon"
        :value="index"
        :class="{ 'error-tab': tabErrors[index] }"
      >
        <VIcon size="20" start :icon="item.icon" />
        {{ item.title }}

        <VIcon v-if="tabErrors[index]" color="error" size="16" class="ml-1">
          mdi-exclamation-thick
        </VIcon>
      </VTab>
    </VTabs>

    <VWindow v-model="activeTab" class="mt-4">
      <!-- Audience -->
      <VWindowItem>
        <VCard class="pa-6">
          <h3 class="mb-2">Audience</h3>
          <p class="text-caption mb-4">
            Choose a cohort or define a real-time filter for the journey audience.
          </p>
          <VBtnToggle
            v-model="audienceMode"
            mandatory
            density="compact"
            color="primary"
            divided
            class="mb-6"
            :disabled="isViewMode && !isEditing"
          >
            <VBtn value="cohort">Select Cohort</VBtn>
            <VBtn value="filter">Real-Time Filter</VBtn>
          </VBtnToggle>

          <FilterBuilder
            v-if="audienceMode === 'cohort'"
            v-model="flow.filter"
            :ignoreEventfilterType="true"
            :ignoreEventDatafilterType="true"
            :ignoreCustomEventfilterType="true"
            :ignoreSlicefilterType="true"
            :ignoreProfileAttribute="true"
            :ignoreSystemAttribute="true"
            :readonly="isViewMode && !isEditing"
            ref="filterRef"
          />

          <FilterBuilder
            v-else
            v-model="flow.filter"
            :ignoreEventfilterType="true"
            :ignoreEventDatafilterType="true"
            :ignoreCustomEventfilterType="true"
            :ignoreCohortfilterType="true"
            :ignoreSlicefilterType="true"
            :readonly="isViewMode && !isEditing"
            ref="filterRef"
          />
        </VCard>
      </VWindowItem>

      <!-- Flow -->
      <VWindowItem>
        <div v-if="isAnalyticsMode" class="analytics-summary mb-4 section-loader-wrap">
          <div ref="analyticsSummaryExportRef">
            <VRow align="start" class="ma-0">
              <!-- Stat cards — span 9 cols -->
              <VCol cols="12" md="9" class="pa-0 d-flex flex-wrap gap-3">
                <VCard
                  v-for="stat in ANALYTICS_STATS"
                  :key="stat.key"
                  variant="tonal"
                  :color="stat.color"
                  class="analytics-stat-card px-4 py-3"
                >
                  <div class="d-flex align-center gap-2">
                    <VIcon :icon="stat.icon" size="20" />
                    <div>
                      <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
                      <div class="text-h6 font-weight-bold">{{ analyticsData?.summary?.[stat.key] ?? '—' }}</div>
                    </div>
                  </div>
                </VCard>
              </VCol>

              <VCol cols="12" md="3" class="pa-0 ps-md-4" style="min-width: 270px; max-width: 350px;">
                <div class="d-flex align-center gap-2">
                  <VMenu transition="scale-transition" open-on-hover>
                    <template #activator="{ props: menuProps }">
                      <VBtn
                        v-show="!isCapturingSummary"
                        icon="tabler-download"
                        variant="text"
                        color="secondary"
                        size="small"
                        v-bind="menuProps"
                      />
                    </template>

                    <VList density="compact">
                      <VListItem @click="exportAnalyticsToExcel">
                        <template #prepend>
                          <VIcon icon="tabler-file-spreadsheet" size="18" class="me-2" />
                        </template>
                        <VListItemTitle>Download Summary as Excel</VListItemTitle>
                      </VListItem>
                      <VListItem @click="downloadSummaryImage">
                        <template #prepend>
                          <VIcon icon="tabler-photo" size="18" class="me-2" />
                        </template>
                        <VListItemTitle>Download Summary as Image</VListItemTitle>
                      </VListItem>
                      <VListItem @click="downloadFlowImage">
                        <template #prepend>
                          <VIcon icon="tabler-vector" size="18" class="me-2" />
                        </template>
                        <VListItemTitle>Download Flow as Image</VListItemTitle>
                      </VListItem>
                    </VList>
                  </VMenu>

                  <div style="min-width: 270px; max-width: 350px;">
                    <AppDateTimePicker
                      v-model="analyticsDateRange"
                      class="flex-grow-1"
                      placeholder="Select date range"
                      prepend-inner-icon="tabler-calendar"
                      :config="{
                        mode: 'range',
                        enableTime: false,
                        dateFormat: 'Y-m-d',
                        maxDate: 'today',
                        onClose: onAnalyticsDateClosed,
                      }"
                    />
                  </div>
                </div>
              </VCol>
            </VRow>
          </div>
          <div v-if="analyticsLoading" class="section-loader-overlay">
            <VProgressCircular indeterminate color="primary" size="40" />
          </div>
        </div>

        <div class="section-loader-wrap">
          <FlowEditor
            ref="flowEditorRef"
            :initial-flow="flowRecord"
            :disabled="isViewMode && !isEditing"
            :analytics-nodes-map="analyticsNodesMap"
          />
          <div v-if="isFetching" class="section-loader-overlay">
            <VProgressCircular indeterminate color="primary" size="48" />
          </div>
        </div>
      </VWindowItem>
    </VWindow>
  </div>
</template>

<style scoped>
.error-tab {
  color: rgb(var(--v-theme-error));
}
.analytics-stat-card {
  min-width: 130px;
  flex: 0 0 auto;
}
.section-loader-wrap {
  position: relative;
}
.section-loader-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(1px);
  border-radius: 8px;
  z-index: 2;
}
</style>
