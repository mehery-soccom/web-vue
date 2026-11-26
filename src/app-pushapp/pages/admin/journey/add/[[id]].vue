<script setup>
import FlowEditor from "@/app-pushapp/views/admin/journeys/Floweditor.vue";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import AudienceCountCheck from "@app-pushapp/views/admin/app-engagements/AudienceCountCheck.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";
import { useFlowsStore } from "@/app-pushapp/views/admin/journeys/useFlowsStore";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import {
  extractKinds,
  isBroadcastKind,
  labelForKind,
  resolveKind,
} from "@/app-pushapp/views/admin/journeys/journeyKind";
import { fmtNum } from "@app-pushapp/@core/utils/formatters";
import { toPng } from "html-to-image";
import * as XLSX from "xlsx";

const FlowsStore = useFlowsStore();
const pushNotificationStore = usePushNotificationStore();
const route = useRoute();
const router = useRouter();
const { show } = inject("snackbar");
const isLoading = ref(false);
const isFetching = ref(false);
const editorReady = ref(false);
const flowRecord = ref(null);
const kinds = ref([]);
const journeyKind = ref("EVENT");
const isViewMode = computed(() => !!route.params.id);
const isEditing = computed(() => "edit" in route.query);
const isAnalyticsMode = computed(() => route.query.analytics === "true");
const isBroadcast = computed(() => isBroadcastKind(journeyKind.value));
const kindLabelText = computed(() => {
  const record = flowRecord.value;
  if (record?.kindLabel && resolveKind(record.kind) === journeyKind.value)
    return record.kindLabel;
  return labelForKind(kinds.value, journeyKind.value);
});
const canEditDefinition = computed(() => {
  if (!isViewMode.value) return true;
  if (!isEditing.value) return false;
  if (
    isBroadcast.value &&
    flowRecord.value?.status &&
    flowRecord.value.status !== "DRAFT"
  )
    return false;
  return true;
});
const broadcastCurrentNode = computed(() => {
  const node = flowRecord.value?.broadcastRun?.currentNode;
  if (typeof node === "string" && node) return { id: node, code: "" };
  if (node && typeof node.id === "string" && node.id) return node;
  return null;
});
const broadcastCurrentNodeId = computed(() => broadcastCurrentNode.value?.id || "");
const canOpenAnalytics = computed(() => {
  if (!isViewMode.value || isAnalyticsMode.value) return false;
  const status = flowRecord.value?.status;
  return Boolean(status && status !== "DRAFT" && status !== "SCHEDULED");
});
const showPlannedStart = computed(() => {
  const record = flowRecord.value;
  return Boolean(record?.status && record.status !== "DRAFT" && record.schedule?.runAt);
});
const showBroadcastRun = computed(() => {
  const record = flowRecord.value;
  return Boolean(record?.broadcastRun && record.status && record.status !== "DRAFT");
});
const journeyStatusLabel = computed(() => ({
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ON_GOING: "Live",
  PAUSED: "Paused",
  ENDED: "Terminated",
}[flowRecord.value?.status] || ""));
const journeyStatusColor = computed(() => ({
  DRAFT: "secondary",
  SCHEDULED: "info",
  ON_GOING: "success",
  PAUSED: "warning",
  ENDED: "error",
}[flowRecord.value?.status]));

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
  `${formatAnalyticsDate(defaultAnalyticsFrom())} to ${formatAnalyticsDate(
    new Date(),
  )}`,
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

const formatDdMmYyyy = (value) => {
  const d = parseYmd(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
};

const analyticsDateFormat = "DD/MM/YYYY";

const analyticsTimezone = () =>
  window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] ||
  "Asia/Kolkata";

const parseAnalyticsRange = (selectedDates) => {
  if (Array.isArray(selectedDates) && selectedDates.length === 2) {
    return {
      from: startOfDayTs(selectedDates[0]),
      to: endOfDayTs(selectedDates[1]),
      fromStr: formatDdMmYyyy(selectedDates[0]),
      toStr: formatDdMmYyyy(selectedDates[1]),
    };
  }
  const [from, to] = String(analyticsDateRange.value || "")
    .split(" to ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!from || !to) return {};
  return {
    from: startOfDayTs(from),
    to: endOfDayTs(to),
    fromStr: formatDdMmYyyy(from),
    toStr: formatDdMmYyyy(to),
  };
};

const BROADCAST_SUMMARY = [
  {
    key: "messageCount",
    label: "Messages",
    icon: "tabler-messages",
    color: "info",
  },
  { key: "sent", label: "Sent", icon: "tabler-send", color: "primary" },
  {
    key: "failed",
    label: "Failed",
    icon: "tabler-alert-circle",
    color: "error",
  },
  {
    key: "opened",
    label: "Opened",
    icon: "tabler-mail-opened",
    color: "success",
  },
];

const ANALYTICS_STATS = [
  {
    key: "uniqueProfiles",
    label: "Users",
    icon: "tabler-users",
    color: "info",
  },
  {
    key: "totalTrips",
    label: "Total Trips",
    icon: "tabler-route",
    color: "primary",
  },
  {
    key: "runningTrips",
    label: "Active",
    icon: "tabler-player-play",
    color: "warning",
  },
  {
    key: "completedTrips",
    label: "Completed",
    icon: "tabler-checks",
    color: "success",
  },
  {
    key: "completedSuccess",
    label: "Success",
    icon: "tabler-mood-smile",
    color: "success",
  },
  {
    key: "completedFailure",
    label: "Failed",
    icon: "tabler-mood-sad",
    color: "error",
  },
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
    const { from, to, fromStr, toStr } = parseAnalyticsRange(selectedDates);
    const res = await FlowsStore.fetchFlowAnalytics({
      id,
      from,
      to,
      fromStr,
      toStr,
      tz: analyticsTimezone(),
      format: analyticsDateFormat,
    });
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

const broadcastSummary = computed(() => {
  if (!isBroadcast.value) return null;
  const nodes = (analyticsData.value?.nodes || []).filter(
    (node) =>
      node.messageCount != null ||
      node.sent != null ||
      node.failed != null ||
      node.opened != null,
  );
  if (!nodes.length) return null;
  return nodes.reduce(
    (sum, node) => ({
      messageCount: sum.messageCount + (Number(node.messageCount) || 0),
      sent: sum.sent + (Number(node.sent) || 0),
      failed: sum.failed + (Number(node.failed) || 0),
      opened: sum.opened + (Number(node.opened) || 0),
    }),
    { messageCount: 0, sent: 0, failed: 0, opened: 0 },
  );
});

async function loadBroadcastAnalytics(id) {
  try {
    analyticsLoading.value = true;
    let analyticsNodes = [];
    try {
      const res = await FlowsStore.fetchFlowAnalytics({ id });
      const data = res.data?.data ?? res.data ?? {};
      analyticsNodes = data.nodes || [];
    } catch (error) {
      console.error("[Analytics] broadcast analytics failed", error);
    }
    const ids = new Map();
    for (const node of flowRecord.value?.broadcastRun?.nodes || []) {
      if (node?.nodeId && node?.campaignId)
        ids.set(node.nodeId, node.campaignId);
    }
    for (const node of analyticsNodes) {
      if (node?.nodeId && node?.campaignId)
        ids.set(node.nodeId, node.campaignId);
    }
    const nodes = [];
    await Promise.all(
      [...ids.entries()].map(async ([nodeId, campaignId]) => {
        try {
          const campaignRes = await pushNotificationStore.fetchCampaign({
            id: campaignId,
          });
          const campaign = campaignRes.data?.data;
          if (!campaign) return;
          nodes.push({
            nodeId,
            campaignId,
            messageCount: campaign.messageCount ?? 0,
            sent: campaign.stats?.sent ?? 0,
            failed: campaign.stats?.failed ?? 0,
            opened: campaign.stats?.opened ?? 0,
            ...campaignRunTimes(campaign),
          });
        } catch (error) {
          console.error("[Analytics] campaign failed", campaignId, error);
        }
      }),
    );
    analyticsData.value = { nodes };
  } catch (error) {
    console.error("[Analytics] failed to load", error);
    show({ message: "Failed to load analytics", color: "error" });
  } finally {
    analyticsLoading.value = false;
  }
}

const refreshAnalytics = () => {
  if (!route.params.id) return;
  if (isBroadcast.value) loadBroadcastAnalytics(route.params.id);
  else loadAnalytics(route.params.id);
};

const formatRunAt = (iso, timeZone) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const campaignRunTimes = (campaign) => {
  const history = Array.isArray(campaign?.statusHistory) ? campaign.statusHistory : [];
  const terminal = [...history].reverse().find((entry) =>
    ["COMPLETED", "FAILED", "CANCELLED", "CANCELED", "ERROR"].includes(
      String(entry?.status || "").toUpperCase(),
    ),
  );
  const started = campaign?.dispatchClaimedAt || campaign?.createdStamp || campaign?.schedule?.lastRunAt;
  const ended = terminal?.changedAt;
  return {
    startedAt: started ? formatRunAt(started) : "",
    endedAt: ended ? formatRunAt(ended) : "",
    endedAtIso: ended || "",
  };
};

const scheduleZoneLabel = (timezone) => {
  const raw = String(timezone || "").trim();
  if (!raw) return "";
  const [zone, offset] = raw.split("::");
  return [zone, offset].filter(Boolean).join(" · ");
};

const humanizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const runTone = (value) => {
  const key = String(value || "").toUpperCase();
  if (["COMPLETED", "SUCCESS", "SUCCEEDED"].includes(key)) return "success";
  if (["FAILED", "ERROR", "CANCELLED", "CANCELED"].includes(key))
    return "error";
  if (["RUNNING", "ON_GOING", "IN_PROGRESS", "ACTIVE"].includes(key))
    return "primary";
  if (key === "PAUSED") return "warning";
  if (["PENDING", "SCHEDULED", "QUEUED"].includes(key)) return "info";
  return "secondary";
};

const runStateDiffers = (run) => {
  const status = String(run?.status || "")
    .trim()
    .toUpperCase();
  const state = String(run?.state || "")
    .trim()
    .toUpperCase();
  return Boolean(state) && state !== status;
};

const runIcon = (value) => {
  const key = String(value || "").toUpperCase();
  if (["COMPLETED", "SUCCESS", "SUCCEEDED"].includes(key))
    return "mdi-check-circle-outline";
  if (["FAILED", "ERROR", "CANCELLED", "CANCELED"].includes(key))
    return "mdi-close-circle-outline";
  if (key === "PAUSED") return "mdi-pause-circle-outline";
  if (["PENDING", "SCHEDULED", "QUEUED"].includes(key))
    return "mdi-clock-outline";
  return "mdi-play-circle-outline";
};
const analyticsSummaryExportRef = ref(null);
const isCapturingSummary = ref(false);

const getJourneyDisplayName = () =>
  (flow.name || flowRecord.value?.name || "journey").trim();
const sanitizeFilePart = (value) =>
  String(value)
    .replace(/[^\w-]+/g, "_")
    .replace(/_+/g, "_");

const getAnalyticsDateFilePart = () => {
  const parts = String(analyticsDateRange.value || "")
    .split(" to ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2 && parts[0] !== parts[1]) {
    return `${parts[0]}-${parts[1]}`;
  }
  return parts[0] || formatAnalyticsDate(new Date());
};

const getAnalyticsFileBaseName = () =>
  `JA_${sanitizeFilePart(
    getJourneyDisplayName(),
  )}_${getAnalyticsDateFilePart()}`;

const triggerFileDownload = (href, fileName) => {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = href;
  link.click();
};

const captureElementAsPng = async (el) => {
  const opts = {
    cacheBust: true,
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    skipFonts: true,
  };
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

const downloadFlowHtml = () => {
  const html = flowEditorRef.value?.buildFlowHtml?.(getJourneyDisplayName());
  if (!html) {
    show({ message: "Flow canvas is not ready yet", color: "warning" });
    return;
  }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerFileDownload(url, `${getAnalyticsFileBaseName()}_flow.html`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

const activeTab = ref(route.params.id && !("edit" in route.query) ? 1 : 0);

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
  flow.filter.children.splice(
    0,
    flow.filter.children.length,
    ...initialFilter.children,
  );
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
  if (
    selectedTypes.length &&
    selectedTypes.every((type) => type === "cohort")
  ) {
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

const validateAudienceFilter = async () => {
  const filterValid = await filterRef.value?.isValid();
  let filterStructureValid = true;
  try {
    validateFilterStructure(flow.filter, null, true, true, true, false);
  } catch (error) {
    filterStructureValid = false;
    show({ message: error.message, color: "error" });
  }
  return !!(filterValid && filterStructureValid);
};

const isValidTab = async (tab, silent = false) => {
  let valid = true;

  switch (tab) {
    case 0: {
      if (isBroadcast.value && audienceMode.value === "FLEXIBLE") {
        valid = true;
        break;
      }
      if (silent) {
        const filterValid = await filterRef.value?.isValid(true);
        let filterStructureValid = true;
        try {
          validateFilterStructure(flow.filter, null, true, true, true, false);
        } catch {
          filterStructureValid = false;
        }
        if (!filterValid || !filterStructureValid) valid = false;
      } else if (!(await validateAudienceFilter())) {
        valid = false;
      }
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
    const payload = isBroadcast.value
      ? {
          name: flow.name,
          desc: flow.desc,
          audienceMode: audienceMode.value,
          ...editorPayload,
          ...(audienceMode.value === "FIXED" ? { filter: flow.filter } : {}),
          ...(!route.params.id ? { kind: journeyKind.value } : {}),
        }
      : {
          name: flow.name,
          desc: flow.desc,
          filter: flow.filter,
          ...editorPayload,
          ...(!route.params.id ? { kind: journeyKind.value } : {}),
        };

    if (route.params.id) {
      await FlowsStore.editFlow({ id: route.params.id, ...payload });
      show({ message: "Flow updated successfully", color: "success" });
    } else {
      await FlowsStore.createFlow(payload);
      show({ message: "Flow saved successfully", color: "success" });
    }
    router.push({
      name: "admin-journey-list",
      query: { kind: journeyKind.value },
    });
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
    } else if (e.response?.status === 409) {
      show({
        message: "This journey can only be edited while it is in draft",
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
  journeyKind.value = resolveKind(record.kind);
  if (isBroadcast.value) {
    isSyncingAudienceMode.value = true;
    audienceMode.value = record.audienceMode === "FIXED" ? "FIXED" : "FLEXIBLE";
    await nextTick();
    isSyncingAudienceMode.value = false;
  }
  if (record.filter) {
    const cloned = ensureFilterIds(structuredClone(record.filter));
    Object.assign(flow.filter, cloned);
    if (!isBroadcast.value) {
      isSyncingAudienceMode.value = true;
      audienceMode.value = getAudienceModeFromFilter(cloned);
      await nextTick();
      isSyncingAudienceMode.value = false;
    }
  }
}

async function loadCloneIntoForm(data) {
  journeyKind.value = resolveKind(data.kind || route.query.kind);
  flow.flow = data.flow || {};
  flow.flowRenderer = data.flowRenderer || { drawflow: { Home: {} } };
  if (isBroadcast.value) {
    isSyncingAudienceMode.value = true;
    audienceMode.value = data.audienceMode === "FIXED" ? "FIXED" : "FLEXIBLE";
    await nextTick();
    isSyncingAudienceMode.value = false;
  }
  if (data.filter) {
    const cloned = ensureFilterIds(structuredClone(data.filter));
    Object.assign(flow.filter, cloned);
    if (!isBroadcast.value) {
      isSyncingAudienceMode.value = true;
      audienceMode.value = getAudienceModeFromFilter(cloned);
      await nextTick();
      isSyncingAudienceMode.value = false;
    }
  }
}

onMounted(async () => {
  try {
    const kindsResponse = await FlowsStore.fetchKinds();
    kinds.value = extractKinds(kindsResponse);
  } catch (error) {
    console.error(error);
    show({ message: "Failed to load journey kinds", color: "error" });
  }

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
      editorReady.value = true;
    }
    if (isAnalyticsMode.value) {
      if (isBroadcast.value) loadBroadcastAnalytics(route.params.id);
      else loadAnalytics(route.params.id);
    }
    return;
  }
  const requested = String(route.query.kind || "").toUpperCase();
  journeyKind.value = kinds.value.some((item) => item.kind === requested)
    ? requested
    : kinds.value[0]?.kind || "EVENT";
  if (isBroadcast.value) audienceMode.value = "FLEXIBLE";
  const cloneData = FlowsStore.consumeCloneData();
  if (cloneData) {
    flowRecord.value = cloneData;
    await loadCloneIntoForm(cloneData);
    show({
      message: "Cloned flow loaded — set a new name to save",
      color: "info",
    });
  }
  editorReady.value = true;
});

watch(isAnalyticsMode, (on) => {
  if (!on || !route.params.id || !flowRecord.value) return;
  activeTab.value = 1;
  refreshAnalytics();
});
</script>

<template>
  <div>
    <VToolbar
      flat
      height="auto"
      class="journey-toolbar px-4 py-3 mb-4 v-card--variant-elevated"
      style="background: rgb(var(--v-theme-surface))"
    >
      <div class="d-flex align-center flex-wrap gap-3 w-100">
        <VIcon size="28" color="primary">mdi-vector-polyline</VIcon>
        <VChip v-if="kindLabelText" size="small" variant="tonal">
          {{ kindLabelText }}
        </VChip>
        <VChip
          v-if="journeyStatusLabel"
          size="small"
          variant="tonal"
          :color="journeyStatusColor"
        >
          {{ journeyStatusLabel }}
        </VChip>

        <div class="journey-toolbar-fields">
          <AppTextField
            v-model="flow.name"
            placeholder="Untitled Flow"
            :error="!!errors.name"
            @update:model-value="clearError('name')"
            :disabled="isViewMode"
          />
          <AppTextField
            v-model="flow.desc"
            placeholder="Description"
            :disabled="!canEditDefinition"
          />
        </div>

        <div class="d-flex align-center flex-wrap gap-2 ms-auto">
          <VBtn
            variant="tonal"
            color="secondary"
            :to="{ name: 'admin-journey-list', query: { kind: journeyKind } }"
          >
            Exit
          </VBtn>

          <VBtn v-if="nextTab" color="primary" @click="proceedToNextTab">
            {{ nextTab }}
            <VIcon end icon="mdi-arrow-right" />
          </VBtn>

          <VBtn
            v-else-if="canEditDefinition"
            color="success"
            :loading="isLoading"
            @click="launchFlow"
          >
            Save Flow
            <VIcon end icon="mdi-check" />
          </VBtn>
        </div>
      </div>
    </VToolbar>

    <VCard
      v-if="
        isBroadcast && (showPlannedStart || showBroadcastRun)
      "
      class="journey-run-bar mb-4"
      variant="elevated"
    >
      <div v-if="showPlannedStart" class="journey-run-fact">
        <VAvatar color="info" variant="tonal" size="40" rounded>
          <VIcon icon="mdi-calendar-clock" size="22" />
        </VAvatar>
        <div class="min-width-0">
          <div class="journey-run-label journey-run-label--phrase">Scheduled For</div>
          <div class="journey-run-value">
            {{
              formatRunAt(
                flowRecord.schedule.runAt,
                flowRecord.schedule.timezone,
              )
            }}
          </div>
          <div v-if="flowRecord.schedule.timezone" class="journey-run-hint">
            {{ scheduleZoneLabel(flowRecord.schedule.timezone) }}
          </div>
        </div>
      </div>
      <div v-if="showBroadcastRun" class="journey-run-fact">
        <VAvatar
          :color="runTone(flowRecord.broadcastRun.status)"
          variant="tonal"
          size="40"
          rounded
        >
          <VIcon :icon="runIcon(flowRecord.broadcastRun.status)" size="22" />
        </VAvatar>
        <div>
          <div class="journey-run-label">Run Status</div>
          <VChip
            size="small"
            variant="tonal"
            :color="runTone(flowRecord.broadcastRun.status)"
          >
            {{ humanizeToken(flowRecord.broadcastRun.status) || "—" }}
            <VTooltip
              v-if="runStateDiffers(flowRecord.broadcastRun)"
              activator="parent"
              location="top"
            >
              State: {{ humanizeToken(flowRecord.broadcastRun.state) }}
            </VTooltip>
          </VChip>
        </div>
      </div>
    </VCard>

    <div class="journey-tabs-row">
      <VTabs v-model="activeTab" class="v-tabs-pill journey-tabs">
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
      <VBtn
        v-if="canOpenAnalytics"
        class="ms-auto"
        variant="tonal"
        color="primary"
        :to="{
          name: 'admin-journey-add-id?',
          params: { id: route.params.id },
          query: { analytics: 'true' },
        }"
      >
        View Analytics
        <VIcon end icon="tabler-chart-bar" />
      </VBtn>
    </div>

    <VWindow v-model="activeTab" class="mt-4">
      <!-- Audience -->
      <VWindowItem>
        <VCard v-if="isBroadcast" class="pa-6">
          <h3 class="mb-2">Audience</h3>
          <p class="text-caption mb-4">
            Fixed mode locks the audience at the begining of the journey. A
            Broadcast node can further narrow that list for its own send. On the
            other hand, Flexible mode has no shared audience. Each Broadcast
            node evaluates its own audience filter when that node runs.
          </p>
          <VBtnToggle
            v-model="audienceMode"
            mandatory
            density="compact"
            color="primary"
            divided
            class="mb-6"
            :disabled="!canEditDefinition"
          >
            <VBtn value="FIXED">Fixed</VBtn>
            <VBtn value="FLEXIBLE">Flexible</VBtn>
          </VBtnToggle>
          <FilterBuilder
            v-if="audienceMode === 'FIXED'"
            v-model="flow.filter"
            :ignoreEventfilterType="true"
            :ignoreEventDatafilterType="true"
            :ignoreCustomEventfilterType="true"
            :ignoreCohortfilterType="true"
            :ignoreSlicefilterType="true"
            :readonly="!canEditDefinition"
            ref="filterRef"
          />
          <p v-else class="text-body-2 mb-0">
            Every Broadcast node needs its own filter. It is evaluated live at
            that node.
          </p>
          <div v-if="audienceMode === 'FIXED'" class="d-flex justify-end mt-6">
            <AudienceCountCheck
              :filter="flow.filter"
              :validate="validateAudienceFilter"
            />
          </div>
        </VCard>
        <VCard v-else class="pa-6">
          <h3 class="mb-2">Audience</h3>
          <p class="text-caption mb-4">
            Choose a cohort or define a real-time filter for the journey
            audience.
          </p>
          <VBtnToggle
            v-model="audienceMode"
            mandatory
            density="compact"
            color="primary"
            divided
            class="mb-6"
            :disabled="!canEditDefinition"
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
            :readonly="!canEditDefinition"
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
            :readonly="!canEditDefinition"
            ref="filterRef"
          />
          <div class="d-flex justify-end mt-6">
            <AudienceCountCheck
              :filter="flow.filter"
              :validate="validateAudienceFilter"
            />
          </div>
        </VCard>
      </VWindowItem>

      <!-- Flow -->
      <VWindowItem>
        <div
          v-if="isAnalyticsMode && isBroadcast"
          class="analytics-summary mb-4 section-loader-wrap"
          style="display: none"
        >
          <div
            v-if="broadcastSummary"
            class="d-flex flex-wrap align-center gap-3"
          >
            <VCard
              v-for="stat in BROADCAST_SUMMARY"
              :key="stat.key"
              variant="tonal"
              :color="stat.color"
              class="analytics-stat-card px-4 py-3"
            >
              <div class="d-flex align-center gap-2">
                <VIcon :icon="stat.icon" size="20" />
                <div>
                  <div class="text-caption text-medium-emphasis">
                    {{ stat.label }}
                  </div>
                  <div class="text-h6 font-weight-bold">
                    {{ fmtNum(broadcastSummary[stat.key]) }}
                  </div>
                </div>
              </div>
            </VCard>
            <VBtn
              icon
              variant="text"
              color="secondary"
              size="small"
              :loading="analyticsLoading"
              @click="refreshAnalytics"
            >
              <VIcon icon="tabler-refresh" />
              <VTooltip activator="parent">Refresh</VTooltip>
            </VBtn>
          </div>
          <div v-if="analyticsLoading" class="section-loader-overlay">
            <VProgressCircular indeterminate color="primary" size="40" />
          </div>
        </div>
        <div
          v-else-if="isAnalyticsMode"
          class="analytics-summary mb-4 section-loader-wrap"
        >
          <div ref="analyticsSummaryExportRef">
            <VRow align="start" class="ma-0">
              <!-- Stat cards — span 9 cols -->
              <VCol cols="12" md="8" class="pa-0 d-flex flex-column">
                <div class="d-flex flex-wrap gap-3">
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
                        <div class="text-caption text-medium-emphasis">
                          {{ stat.label }}
                        </div>
                        <div class="text-h6 font-weight-bold">
                          {{
                            analyticsData?.summary?.[stat.key] != null
                              ? fmtNum(analyticsData.summary[stat.key])
                              : "—"
                          }}
                        </div>
                      </div>
                    </div>
                  </VCard>
                </div>
                <p
                  class="analytics-date-disclaimer text-caption text-disabled text-start mt-2 mb-0 pl-2"
                >
                  <!-- <VIcon icon="tabler-info-circle" size="14" /> -->
                  Disclaimer : Counts include journeys that started in the
                  selected dates. A journey that started earlier is not
                  included, even if it finished in this range.
                </p>
              </VCol>

              <VCol
                cols="12"
                md="4"
                class="pa-0 ms-auto"
                style="min-width: 350px; max-width: 400px"
              >
                <div class="d-flex align-center gap-2">
                  <div class="flex-grow-1" style="min-width: 270px">
                    <AppDateTimePicker
                      v-model="analyticsDateRange"
                      class="w-100"
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
                  <div style="min-width: 40px">
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
                            <VIcon
                              icon="tabler-file-spreadsheet"
                              size="18"
                              class="me-2"
                            />
                          </template>
                          <VListItemTitle
                            >Download Summary as Excel</VListItemTitle
                          >
                        </VListItem>
                        <VListItem @click="downloadSummaryImage">
                          <template #prepend>
                            <VIcon icon="tabler-photo" size="18" class="me-2" />
                          </template>
                          <VListItemTitle
                            >Download Summary as Image</VListItemTitle
                          >
                        </VListItem>
                        <VListItem @click="downloadFlowImage">
                          <template #prepend>
                            <VIcon
                              icon="tabler-vector"
                              size="18"
                              class="me-2"
                            />
                          </template>
                          <VListItemTitle
                            >Download Flow as Image</VListItemTitle
                          >
                        </VListItem>
                        <VListItem @click="downloadFlowHtml">
                          <template #prepend>
                            <VIcon
                              icon="tabler-file-code"
                              size="18"
                              class="me-2"
                            />
                          </template>
                          <VListItemTitle>Download Flow as HTML</VListItemTitle>
                        </VListItem>
                      </VList>
                    </VMenu>
                  </div>
                  <div style="min-width: 40px">
                    <VBtn
                      v-show="!isCapturingSummary"
                      icon
                      variant="text"
                      color="secondary"
                      size="small"
                      :loading="analyticsLoading"
                      @click="refreshAnalytics"
                    >
                      <VIcon icon="tabler-refresh" />
                      <VTooltip activator="parent">Refresh</VTooltip>
                    </VBtn>
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
            v-if="editorReady"
            ref="flowEditorRef"
            :initial-flow="flowRecord"
            :disabled="!canEditDefinition"
            :kind="journeyKind"
            :audience-mode="audienceMode"
            :current-node-id="isAnalyticsMode ? broadcastCurrentNodeId : ''"
            :analytics-nodes-map="isAnalyticsMode ? analyticsNodesMap : {}"
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
.journey-toolbar :deep(.v-toolbar__content) {
  height: auto;
  overflow: visible;
}
.journey-toolbar-fields {
  display: flex;
  flex: 1 1 320px;
  gap: 12px;
  min-width: 0;
}
.journey-toolbar-fields > * {
  min-width: 0;
}
.journey-toolbar-fields > :first-child {
  flex: 1 1 180px;
}
.journey-toolbar-fields > :last-child {
  flex: 2 1 220px;
}
.journey-tabs-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.journey-tabs {
  flex: 0 1 auto;
  width: auto;
}
.journey-run-bar :deep(.v-card__content),
.journey-run-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
}
.journey-run-fact {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 280px;
  min-width: 0;
  padding: 12px 16px;
}
.journey-run-fact + .journey-run-fact {
  border-inline-start: thin solid rgba(var(--v-theme-on-surface), 0.12);
}
.journey-run-label {
  margin-bottom: 2px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.58);
}
.journey-run-label--phrase {
  text-transform: none;
  letter-spacing: 0.01em;
}
.journey-run-value {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
}
.journey-run-hint {
  font-size: 0.75rem;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
@media (max-width: 720px) {
  .journey-run-fact + .journey-run-fact {
    border-inline-start: 0;
    border-top: thin solid rgba(var(--v-theme-on-surface), 0.12);
  }
}
.error-tab {
  color: rgb(var(--v-theme-error));
}
.analytics-stat-card {
  min-width: 130px;
  flex: 0 0 auto;
}
.analytics-date-disclaimer {
  font-style: italic;
  line-height: 1.35;
}
.analytics-date-disclaimer :deep(.v-icon) {
  margin-inline-end: 4px;
  vertical-align: text-bottom;
  font-style: normal;
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
