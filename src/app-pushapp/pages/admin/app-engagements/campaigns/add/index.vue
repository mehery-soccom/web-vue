<script setup>
import Template from "@app-pushapp/pages/admin/app-engagements/templates/add/[[id]].vue";
import Audience from "@app-pushapp/views/admin/app-engagements/Audience.vue";
import Schedule from "@app-pushapp/views/admin/app-engagements/Schedule.vue";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { useLibraryStore } from "@/app-pushapp/views/config/library/useLibraryStore";
import EngagementCampaignAssistant from "@app-pushapp/views/admin/app-engagements/EngagementCampaignAssistant.vue";
import { normalizeAiFilterTree } from "@/app-pushapp/utils/mapAiFormState";
import { onMounted, nextTick } from "vue";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";

const { show } = inject("snackbar");
const appEngagementsStore = useAppEngagementsStore();
const libraryStore = useLibraryStore();
const { FILTER_FIELDS_MAP } = useAppEngagements();

const route = useRoute();
const router = useRouter();

const isLoading = ref(false);
const campaign = reactive({
  title: "",
  action: {
    type: "template",
    template: {
      id: null,
      code: null,
      type: null,
      subType: null,
    },
    templateB: {
      id: null,
      code: null,
      type: null,
      subType: null,
    },
  },
  audience: {
    userSet: "All Users",
    segmentCondition: null,
    segment: null,
  },
  triggerFilter: {
    type: "group",
    conjunction: "and",
    children: [
      {
        _id: crypto.randomUUID(),
        type: "filter",
        filterType: "event",
        field: null,
        operator: null,
        value: null,
        freqOperator: null,
        freqCount: null,
        freqPeriod: null,
        scannedEvents: null,
      },
    ],
  },
  filter: {
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
  },
  abTesting: {
    enabled: false,
    sampleSize: 5,
    evaluationWindow: 10,
    decisionPolicy: {
      tiePolicy: "abort",
    },
    winnerCriteria: "cta_count",
    distributionParameter: null, // e.g., "platform"
    distributionParameterValues: null,
  },
  schedule: {
    durationType: "ALWAYS",
    startDate: null,
    endDate: null,
    repeatType: null,
    repeatCount: null,
    repeatAfterDays: null,
    recurringType: false,
    schedulePattern: 'daily',
    dailyStartTime: null,
    weeklyStartTime: null,
    monthlyDateStartTime: null,
    monthlyWeekdayStartTime: null,
    dailyEndTime: null,
    weeklyEndTime: null,
    monthlyDateEndTime: null,
    monthlyWeekdayEndTime: null,
  },
  journey: {
    enabled: false,
    code: "",
    nodes: [],
  },
});
watch(
  campaign,
  (val) => {
    console.log("campaign", val);
  },
  { immediate: true, deep: true }
);
const tabs = [
  {
    title: "Trigger Event",
    icon: "tabler-bolt",
  },
  {
    title: "Template",
    icon: "tabler-user-check",
  },
  {
    title: "Audience",
    icon: "tabler-users",
  },
  {
    title: "Scheduling",
    icon: "tabler-layout-grid",
  },
  /*
  {
    title: "Goals",
    icon: "tabler-link"
  },
  */
];
const triggerEventRef = ref();
const activeTemplateVariant = ref("A");
const activeTab = ref(0);
const nextTab = computed(() => {
  const next = tabs[activeTab.value + 1];
  return next ? `Proceed to ${next.title}` : null;
});
const tabErrors = ref({
  0: false,
  1: false,
  2: false,
});
const templateRef = ref();
const templateBRef = ref();
const audienceRef = ref();
const scheduleRef = ref();
const errors = ref({});
const temp = ref(null);
const tempB = ref(null);
const templateList = ref([]);
const fetchTemplateList = async () => {
  try {
    const response = await appEngagementsStore.fetchTemplates({
      page: 0,
      itemsPerPage: 250,
    });
    templateList.value = response.data.results.map((r) => ({
      ...r,
      id: r._id,
    })).sort((a, b) => a.desc.localeCompare(b.desc));
  } catch (e) {
    console.log("templates error", e);
  }
};

const onSelectTemplate = (param = "t_edit", id) => {
  router.replace({
    query: {
      ...route.query,
      [param]: id,
    },
  });
};

const clearError = (field) => {
  errors.value[field] = null;
};
const buildSchedulePayload = (form) => {
  const timezone = form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const payload = {
    durationType: form.durationType,
    startDate: form.startDate ? new Date(form.startDate).getTime() : null,
    endDate: form.endDate ? new Date(form.endDate).getTime() : null,
    // dateRange: { 
    //   start: form.startDate ? new Date(form.startDate).getTime() : null,
    //   end: form.endDate ? new Date(form.endDate).getTime() : null,
    // },
    enableActiveWindow: !!form.recurringType,
    timezone,
  };

  if (form.recurringType) {
    switch (form.schedulePattern) {
      case "daily":
        payload.rrule = "FREQ=DAILY";
        payload.activeHours = { start: form.startTime, end: form.endTime };
        break;
      case "weekly":
        payload.rrule = `FREQ=WEEKLY;BYDAY=${(form.scheduleDays || []).join(",")}`;
        payload.activeHours = { start: form.weeklyStartTime, end: form.weeklyEndTime };
        break;
      case "monthlyDate":
        payload.rrule = `FREQ=MONTHLY;BYMONTHDAY=${form.scheduleDate}`;
        payload.activeHours = { start: form.monthlyDateStartTime, end: form.monthlyDateEndTime };
        break;
      case "monthlyWeekday":
        const weekMap = { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, LAST: -1 };
        payload.rrule = `FREQ=MONTHLY;BYDAY=${(form.scheduleWeekday || []).join(",")};BYSETPOS=${weekMap[form.scheduleWeek]}`;
        payload.activeHours = { start: form.monthlyWeekdayStartTime, end: form.monthlyWeekdayEndTime };
        break;
    }
  }
  return payload;
};

const proceedToNextTab = async () => {
  let valid = await isValidTab(activeTab.value);

  if (valid) {
    activeTab.value += 1;
  }
};

const isValidTab = async (tab, silent = false) => {
  let valid = true;

  switch (tab) {
    case 0:
      let triggerEventValid = await triggerEventRef.value?.isValid(silent);
      if (!triggerEventValid) {
        valid = false;
      }
      break;
    case 1:
      let templateValid = await templateRef.value?.isValid(silent);
      let templateBValid = campaign.abTesting.enabled
        ? await templateBRef.value?.isValid(silent)
        : true;
      if (!templateValid || !templateBValid) {
        valid = false;
      }
      break;
    case 2:
      let audienceValid = await audienceRef.value?.isValid(silent);
      if (!audienceValid) {
        valid = false;
      }
      break;
    case 3:
      let scheduleValid = await scheduleRef.value?.isValid(silent);
      if (!scheduleValid) {
        valid = false;
      }
      break;

    default:
      break;
  }

  if (!silent) tabErrors.value[tab] = !valid;

  return valid;
};

const isValid = async (silent = false) => {
  let _tabs = await Promise.allSettled(
    tabs.map((t, i) => isValidTab(i, silent))
  );
  let tabsValid = _tabs.every((r) => !!r.value);

  let e = {};

  if (!campaign["title"]) {
    e["title"] = true;
  }

  if (!silent) errors.value = e;

  return !Object.keys(e).length && tabsValid;
};

const findCohortFilter = (node) => {
  if (!node) return null;
  if (node.type === "filter" && node.filterType === "cohort") return node;
  if (node.type === "group") {
    for (const child of node.children || []) {
      const found = findCohortFilter(child);
      if (found) return found;
    }
  }
  return null;
};
const create = async () => {
  try {
    isLoading.value = true;
    const valid = await isValid();
    if (valid) {
      const cohortFilter = findCohortFilter(campaign.filter);
      const payload = {
        ...campaign,
        triggerFilter: campaign.triggerFilter,
        filter: cohortFilter ? { type: "group", conjunction: "and", children: [cohortFilter] } : campaign.filter,
        schedule: buildSchedulePayload(campaign.schedule)
        // schedule: {
        //   ...campaign.schedule,
        //   startDate: campaign.schedule.startDate ? new Date(campaign.schedule.startDate).getTime() : null,
        //   endDate: campaign.schedule.endDate ? new Date(campaign.schedule.endDate).getTime() : null,
        // },
      };
      const templateRes = await (route.query.t_edit
        ? templateRef.value._onUpdate()
        : templateRef.value._onCreate()); // _onCreate()
      payload.action.template.id = templateRes.data._id;
      payload.action.template.code = templateRes.data.code;
      payload.action.template.type = templateRes.data.type;
      payload.action.template.subType = templateRes.data.subType;
      if (campaign.abTesting.enabled) {
        const templateBRes = await (route.query.t_b_edit
          ? templateBRef.value._onUpdate()
          : templateBRef.value._onCreate()); // _onCreate()
        payload.action.templateB.id = templateBRes.data._id;
        payload.action.templateB.code = templateBRes.data.code;
        payload.action.templateB.type = templateBRes.data.type;
        payload.action.templateB.subType = templateBRes.data.subType;
      }
      await appEngagementsStore.createFilter(payload);
      show({ message: "Campaign saved successfully", color: "success" });
      router.push({ name: "admin-app-engagements-campaigns-list" });
    }
  } catch (error) {
    console.log("create", error);
    show({ message: "Failed to save Campaign. Try again", color: "error" });
  } finally {
    isLoading.value = false;
  }
};
// watch(
//   () => templateRef,
//   (val) => {
//     if (val) {
//       console.log("Template mounted", val?.isPreStep);
//     }
//   },
//   { immediate: true }
// );
onMounted(async () => {
  await fetchTemplateList();
});

const isAgenticAiEnabled = computed(
  () => !!window.CONST?.CONFIG?.FEATURES?.PUSHAPP_AGENTIC_AI,
);
const pendingAssistantState = ref(null);
const assistantExpanded = ref(isAgenticAiEnabled.value);
const aiFlashTabs = ref([]);
const tabWindowTransition = ref(false);
const lastAppliedSectionSigs = ref({
  trigger: "",
  template: "",
  audience: "",
  schedule: "",
});
const lastAiPollMeta = ref({
  trigger: null,
  template: null,
  audience: null,
  schedule: null,
});
const TAB_ORDER = [0, 1, 2, 3];

const sectionSignature = (data) => {
  if (!data || (typeof data === "object" && !Object.keys(data).length)) return "";
  return JSON.stringify(data);
};

const cloneJson = (value) => {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const valuesEqual = (a, b) => sectionSignature(a) === sectionSignature(b);

const aiPollFieldChanged = (section, key, nextValue) => {
  const prevSection = lastAiPollMeta.value[section];
  if (!prevSection) return true;
  if (!(key in prevSection)) return nextValue != null && nextValue !== "";
  return !valuesEqual(prevSection[key], nextValue);
};

const aiPollSectionChanged = (section, nextData) => {
  const prev = lastAiPollMeta.value[section];
  if (!prev) return true;
  return !valuesEqual(prev, nextData);
};

const setAiPollMeta = (section, patch) => {
  lastAiPollMeta.value = {
    ...lastAiPollMeta.value,
    [section]: { ...(lastAiPollMeta.value[section] || {}), ...cloneJson(patch) },
  };
};

const setAiPollMetaSection = (section, data) => {
  lastAiPollMeta.value = { ...lastAiPollMeta.value, [section]: cloneJson(data) };
};

const hasSectionData = (data) =>
  !!(data && typeof data === "object" && Object.keys(data).length);

let aiFlashTimer = null;

const flashAiTabs = (updatedTabs) => {
  if (!updatedTabs.length || !assistantExpanded.value) return;

  aiFlashTabs.value = [...new Set([...aiFlashTabs.value, ...updatedTabs])];

  const targetTab = [...TAB_ORDER].reverse().find((t) => updatedTabs.includes(t));
  if (targetTab != null && activeTab.value !== targetTab) {
    tabWindowTransition.value = true;
    activeTab.value = targetTab;
    setTimeout(() => {
      tabWindowTransition.value = false;
    }, 450);
  }

  if (aiFlashTimer) clearTimeout(aiFlashTimer);
  aiFlashTimer = setTimeout(() => {
    aiFlashTabs.value = aiFlashTabs.value.filter((t) => !updatedTabs.includes(t));
  }, 4000);
};

const applyFilterTree = (target, tree) => {
  target.type = tree.type;
  target.conjunction = tree.conjunction || "and";
  target.children.splice(0, target.children.length, ...tree.children);
};

const ensureCatalogList = async (field) => {
  if (field === "page_open") {
    if (!libraryStore.pageList.length && !libraryStore.pageListLoading) {
      libraryStore.pageListLoading = true;
      try {
        const response = await libraryStore.read({ id: "pages" });
        libraryStore.pageList = response.data.data.options || [];
      } finally {
        libraryStore.pageListLoading = false;
      }
    }
    return libraryStore.pageList;
  }
  if (field === "widget_open") {
    if (!libraryStore.placeholderList.length && !libraryStore.placeholderListLoading) {
      libraryStore.placeholderListLoading = true;
      try {
        const response = await libraryStore.read({ id: "placeholders" });
        libraryStore.placeholderList = response.data.data.options || [];
      } finally {
        libraryStore.placeholderListLoading = false;
      }
    }
    return libraryStore.placeholderList;
  }
  return [];
};

const mapCatalogValue = (list, value) => {
  const mapOne = (item) => {
    const n = String(item ?? "").trim().toLowerCase();
    const match = list.find(
      (opt) =>
        String(opt.code ?? "").toLowerCase() === n ||
        String(opt.label ?? "").toLowerCase() === n,
    );
    return match?.code ?? item;
  };
  if (Array.isArray(value)) return value.map(mapOne);
  if (value == null || value === "") return value;
  return [mapOne(value)];
};

const resolveCatalogValues = async (tree) => {
  if (!tree?.children) return tree;
  for (const child of tree.children) {
    if (child.type === "group") {
      await resolveCatalogValues(child);
      continue;
    }
    if (child.field === "page_open" || child.field === "widget_open") {
      const list = await ensureCatalogList(child.field);
      child.value = mapCatalogValue(list, child.value);
    }
  }
  return tree;
};

const applyActiveWindow = (sch) => {
  const rule = sch.rrule || "";
  const hours = sch.activeHours || {};
  campaign.schedule.rrule = rule;
  campaign.schedule.activeHours = { ...hours };
  campaign.schedule.enableActiveWindow = sch.enableActiveWindow !== false;
  campaign.schedule.recurringType = !!campaign.schedule.enableActiveWindow;

  if (rule.includes("FREQ=DAILY")) {
    campaign.schedule.schedulePattern = "daily";
    campaign.schedule.startTime = hours.start || null;
    campaign.schedule.endTime = hours.end || null;
  } else if (rule.includes("FREQ=WEEKLY")) {
    campaign.schedule.schedulePattern = "weekly";
    campaign.schedule.scheduleDays = rule.match(/BYDAY=([^;]+)/)?.[1]?.split(",") || [];
    campaign.schedule.weeklyStartTime = hours.start || null;
    campaign.schedule.weeklyEndTime = hours.end || null;
  } else if (rule.includes("FREQ=MONTHLY") && rule.includes("BYMONTHDAY")) {
    campaign.schedule.schedulePattern = "monthlyDate";
    campaign.schedule.scheduleDate = rule.match(/BYMONTHDAY=(\d+)/)?.[1];
    campaign.schedule.monthlyDateStartTime = hours.start || null;
    campaign.schedule.monthlyDateEndTime = hours.end || null;
  } else if (rule.includes("FREQ=MONTHLY") && rule.includes("BYSETPOS")) {
    const weekMap = { 1: "FIRST", 2: "SECOND", 3: "THIRD", 4: "FOURTH", "-1": "LAST" };
    campaign.schedule.schedulePattern = "monthlyWeekday";
    campaign.schedule.scheduleWeek = weekMap[rule.match(/BYSETPOS=(-?\d+)/)?.[1]];
    campaign.schedule.scheduleWeekday = rule.match(/BYDAY=([^;]+)/)?.[1]?.split(",") || [];
    campaign.schedule.monthlyWeekdayStartTime = hours.start || null;
    campaign.schedule.monthlyWeekdayEndTime = hours.end || null;
  }
};

const applyAssistantCampaignState = async (campaignState) => {
  if (!campaignState) return;

  const applied = { trigger: false, template: false, audience: false, schedule: false };
  const updated = [];

  const triggerFilter = campaignState.trigger?.triggerFilter;
  if (triggerFilter && aiPollSectionChanged("trigger", triggerFilter)) {
    const tree = await resolveCatalogValues(
      normalizeAiFilterTree(triggerFilter, FILTER_FIELDS_MAP),
    );
    if (tree?.children?.length) {
      applyFilterTree(campaign.triggerFilter, tree);
      applied.trigger = true;
      const sig = sectionSignature(triggerFilter);
      if (sig !== lastAppliedSectionSigs.value.trigger) {
        updated.push(0);
        lastAppliedSectionSigs.value.trigger = sig;
      }
    }
  }
  if (triggerFilter) setAiPollMetaSection("trigger", triggerFilter);

  const tpl = campaignState.template;
  if (hasSectionData(tpl)) {
    const title = tpl.title || tpl.campaignTitle;
    if (title && aiPollFieldChanged("template", "title", title)) {
      campaign.title = title;
      applied.template = true;
    }
    if (title) setAiPollMeta("template", { title });

    const template = tpl.action?.template || tpl.template;
    const templateId = template?.id || null;
    if (templateId && aiPollFieldChanged("template", "templateId", templateId)) {
      campaign.action.template = {
        ...campaign.action.template,
        id: template.id,
        code: template.code ?? campaign.action.template.code,
        type: template.type ?? campaign.action.template.type,
        subType: template.subType ?? campaign.action.template.subType,
      };
      router.replace({ query: { ...route.query, t_edit: templateId } });
      applied.template = true;
    }
    if (templateId) setAiPollMeta("template", { templateId });

    const templateB = tpl.action?.templateB || tpl.templateB;
    if (templateB?.id && aiPollFieldChanged("template", "templateBId", templateB.id)) {
      campaign.abTesting.enabled = true;
      campaign.action.templateB = {
        ...campaign.action.templateB,
        id: templateB.id,
        code: templateB.code,
        type: templateB.type,
        subType: templateB.subType,
      };
      router.replace({ query: { ...route.query, t_b_edit: templateB.id } });
      applied.template = true;
    }
    if (templateB?.id) setAiPollMeta("template", { templateBId: templateB.id });

    if (applied.template) {
      const sig = sectionSignature(tpl);
      if (sig !== lastAppliedSectionSigs.value.template) {
        updated.push(1);
        lastAppliedSectionSigs.value.template = sig;
      }
    }
  }

  const aud = campaignState.audience;
  if (hasSectionData(aud)) {
    if (aud.userSet && aiPollFieldChanged("audience", "userSet", aud.userSet)) {
      campaign.audience.userSet = aud.userSet;
      applied.audience = true;
    }
    if (aud.userSet) setAiPollMeta("audience", { userSet: aud.userSet });

    if (aud.filter && aiPollFieldChanged("audience", "filter", aud.filter)) {
      const tree = await resolveCatalogValues(
        normalizeAiFilterTree(aud.filter, FILTER_FIELDS_MAP),
      );
      if (tree?.children?.length) {
        await nextTick();
        applyFilterTree(campaign.filter, tree);
        applied.audience = true;
        const sig = sectionSignature(aud.filter);
        if (sig !== lastAppliedSectionSigs.value.audience) {
          updated.push(2);
          lastAppliedSectionSigs.value.audience = sig;
        }
      }
    }
    if (aud.filter) setAiPollMeta("audience", { filter: aud.filter });
  }

  const sch = campaignState.schedule;
  if (hasSectionData(sch)) {
    if (sch.durationType && aiPollFieldChanged("schedule", "durationType", sch.durationType)) {
      campaign.schedule.durationType = sch.durationType;
      applied.schedule = true;
    }
    if (sch.durationType) setAiPollMeta("schedule", { durationType: sch.durationType });

    if (sch.startDate != null && aiPollFieldChanged("schedule", "startDate", sch.startDate)) {
      campaign.schedule.startDate = sch.startDate;
      applied.schedule = true;
    }
    if ("startDate" in sch) setAiPollMeta("schedule", { startDate: sch.startDate });

    if (sch.endDate != null && aiPollFieldChanged("schedule", "endDate", sch.endDate)) {
      campaign.schedule.endDate = sch.endDate;
      applied.schedule = true;
    }
    if ("endDate" in sch) setAiPollMeta("schedule", { endDate: sch.endDate });

    if (
      "enableActiveWindow" in sch &&
      aiPollFieldChanged("schedule", "enableActiveWindow", !!sch.enableActiveWindow)
    ) {
      campaign.schedule.enableActiveWindow = !!sch.enableActiveWindow;
      campaign.schedule.recurringType = !!sch.enableActiveWindow;
      applied.schedule = true;
    }
    if ("enableActiveWindow" in sch) {
      setAiPollMeta("schedule", { enableActiveWindow: !!sch.enableActiveWindow });
    }

    const windowSig = JSON.stringify({
      rrule: sch.rrule || null,
      activeHours: sch.activeHours || null,
    });
    if (sch.rrule && aiPollFieldChanged("schedule", "window", windowSig)) {
      applyActiveWindow(sch);
      applied.schedule = true;
      setAiPollMeta("schedule", { window: windowSig });
    }

    if (sch.timezone && aiPollFieldChanged("schedule", "timezone", sch.timezone)) {
      campaign.schedule.timezone = sch.timezone;
      applied.schedule = true;
    }
    if (sch.timezone) setAiPollMeta("schedule", { timezone: sch.timezone });

    if (applied.schedule) {
      const sig = sectionSignature(sch);
      if (sig !== lastAppliedSectionSigs.value.schedule) {
        updated.push(3);
        lastAppliedSectionSigs.value.schedule = sig;
      }
    }
  }

  if (updated.length) flashAiTabs(updated);
};

const onAssistantCampaignState = (campaignState) => {
  if (!campaignState) return;
  pendingAssistantState.value = campaignState;
  applyAssistantCampaignState(campaignState);
};

watch(templateList, () => {
  if (pendingAssistantState.value) {
    applyAssistantCampaignState(pendingAssistantState.value);
  }
});
</script>

<template>
  <div>
    <VToolbar flat class="px-4 mb-4 v-card--variant-elevated" style="background: rgb(var(--v-theme-surface));">
      <!-- Left Section: Icon + Title -->
      <div class="d-flex align-center flex-shrink-0">
        <VIcon size="28" class="mr-3" color="pink">mdi-bullseye-arrow</VIcon>
        <div class="position-relative flex-grow-1" style="min-width: 300px">
          <AppTextField
            autofocus
            v-model="campaign['title']"
            placeholder="Untitled Campaign"
            :error="!!errors['title']"
            @update:modelValue="() => clearError('title')"
          />
        </div>
      </div>

      <!-- Right Section: Actions -->
      <div class="d-flex align-center gap-2 ml-auto">
        <VBtn
          variant="tonal"
          color="secondary"
          :to="{ name: 'admin-app-engagements-campaigns-list' }"
        >
          Exit
        </VBtn>
        <VBtn color="primary" v-if="nextTab" @click="proceedToNextTab">
          {{ nextTab }}
          <VIcon end icon="mdi-arrow-right" />
        </VBtn>
        <VBtn color="primary" v-else @click="create" :loading="isLoading">
          Save Campaign <VIcon end icon="mdi-check"
        /></VBtn>
      </div>
    </VToolbar>

    <!-- Tabs + Switch Row -->
    <div class="d-flex align-center justify-space-between">
      <!-- Tabs -->
      <VTabs v-model="activeTab" class="v-tabs-pill flex-grow-1">
        <VTab
          v-for="(item, index) in tabs"
          :key="item.icon"
          :value="index"
          :class="{
            'error-tab': tabErrors[index],
            'ai-tab-flash': aiFlashTabs.includes(index),
          }"
        >
          <VIcon size="20" start :icon="item.icon" />
          {{ item.title }}
          <VIcon
            v-if="aiFlashTabs.includes(index)"
            icon="tabler-sparkles"
            size="14"
            color="primary"
            class="ml-1 ai-tab-icon"
          />
          <VIcon v-if="tabErrors[index]" color="error" size="16" class="ml-1">
            mdi-exclamation-thick
          </VIcon>
        </VTab>
      </VTabs>

      <!-- Switch on Right -->
      <div class="d-flex align-center ml-4">
        <!-- <VChip variant="tonal" size="large" color="secondary"> -->
        <div class="d-flex align-center">
          <VIcon size="16" color="primary" start>mdi-flask</VIcon>
          <span class="text-body-1 text-primary font-medium">
            Enable A/B Testing
          </span>
          <VSwitch
            v-model="campaign.abTesting.enabled"
            hide-details
            inset
            color="primary"
            class="ml-2"
          />
          <VTooltip activator="parent" location="bottom">
            Test different variants of your template
          </VTooltip>
        </div>
        <!-- </VChip> -->
      </div>
    </div>

    <VWindow v-model="activeTab" class="mt-4">
      <VWindowItem>
        <VCard class="pa-6">
          <h3 class="mb-2">Trigger Event</h3>
          <p class="text-caption mb-4">
            Define the event conditions that will trigger this campaign.
          </p>
          <FilterBuilder
            v-model="campaign.triggerFilter"
            :ignoreCohortfilterType="true"
            :ignoreSlicefilterType="true"
            :ignoreProfileAttribute="true"
            :ignoreSystemAttribute="true"
            ref="triggerEventRef"
          />
        </VCard>
      </VWindowItem>
      <!-- tab-template -->
      <VWindowItem>
        <div
          v-if="campaign.abTesting.enabled"
          class="mb-4 d-flex justify-center"
        >
          <VBtnToggle
            v-model="activeTemplateVariant"
            variant="tonal"
            color="primary"
            mandatory
            density="compact"
            class="rounded-pill"
          >
            <VBtn value="A" density="compact" class="px-4">Variant A</VBtn>
            <VBtn value="B" density="compact" class="px-4">Variant B</VBtn>
          </VBtnToggle>
        </div>

        <!-- Render the template editor based on selected variant -->
        <div
          v-show="!campaign.abTesting.enabled || activeTemplateVariant === 'A'"
        >
          <div
            class="mb-4"
            v-if="!route.query.t_edit && !!templateRef?.isPreStep"
            style="
              width: 100%;
              text-align: center;
              border-bottom: 1px dashed black;
            "
          >
            <!-- select template -->
            <!-- @click="() => onSelectTemplate('t_edit')" -->
            <VRow>
              <!-- <VCol cols="12" md="4"></VCol> -->
              <VCol cols="12" md="4">
                <AppAutocomplete
                  style="margin: 15px 0 25px"
                  v-model="temp"
                  :items="templateList"
                  placeholder="Select Template"
                  item-title="desc"
                  return-object
                  prepend-inner-icon="mdi-shape"
                  @update:modelValue="onSelectTemplate('t_edit', temp.id)"
                />
              </VCol>
            </VRow>
          </div>
          <Template ref="templateRef" :edit="route.query.t_edit" />
        </div>
        <div
          v-show="campaign.abTesting.enabled && activeTemplateVariant === 'B'"
        >
          <!-- select template -->
          <!-- @click="() => onSelectTemplate('t_b_edit')" -->
          <div
            class="mb-4"
            v-if="!route.query.t_b_edit && !!templateBRef?.isPreStep"
            style="
              width: 100%;
              text-align: center;
              border-bottom: 1px dashed black;
            "
          >
            <VRow>
              <!-- <VCol cols="12" md="4"></VCol> -->
              <VCol cols="12" md="4">
                <AppAutocomplete
                  style="margin: 15px 0 25px"
                  v-model="tempB"
                  :items="templateList"
                  placeholder="Select Template"
                  item-title="desc"
                  return-object
                  prepend-inner-icon="mdi-shape"
                  @update:modelValue="onSelectTemplate('t_b_edit', tempB.id)"
                />
              </VCol>
            </VRow>
          </div>
          <Template ref="templateBRef" :edit="route.query.t_b_edit" />
        </div>
      </VWindowItem>

      <!-- tab-audience -->
      <VWindowItem>
        <Audience
          ref="audienceRef"
          v-model="campaign.audience"
          v-model:filter="campaign.filter"
          v-model:abTesting="campaign.abTesting"
        />
      </VWindowItem>

      <!-- tab-schedule -->
      <VWindowItem>
        <Schedule
          ref="scheduleRef"
          v-model="campaign.schedule"
          v-model:journey="campaign.journey"
        />
      </VWindowItem>

      <!-- tab-goals -->
      <!-- <VWindowItem> Goals </VWindowItem> -->
    </VWindow>

    <EngagementCampaignAssistant
      v-if="isAgenticAiEnabled"
      v-model:expanded="assistantExpanded"
      @campaign-state="onAssistantCampaignState"
    />
  </div>
</template>

<style scoped lang="scss">
.sticky-toolbar {
  background: white;
  border-bottom: 1px solid #eee;
}
.error-tab {
  color: #d32f2f !important; /* red text */
  font-weight: 600;
}

:deep(.ai-tab-flash) {
  animation: ai-tab-pulse 0.9s ease-in-out 3;
  border-radius: 8px;
}

:deep(.ai-tab-icon) {
  animation: ai-tab-icon-spin 1.4s ease-in-out infinite;
}

@keyframes ai-tab-pulse {
  0%,
  100% {
    background: transparent;
    box-shadow: none;
  }
  50% {
    background: rgba(var(--v-theme-primary), 0.14);
    box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.35);
  }
}

@keyframes ai-tab-icon-spin {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(1.15);
  }
}
</style>
