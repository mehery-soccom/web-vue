<script setup>
import Template from "@app-pushapp/pages/admin/app-engagements/templates/add/[[id]].vue";
import Audience from "@app-pushapp/views/admin/app-engagements/Audience.vue";
import Schedule from "@app-pushapp/views/admin/app-engagements/Schedule.vue";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import { onMounted } from "vue";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";

const { show } = inject("snackbar");
const appEngagementsStore = useAppEngagementsStore();

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
];
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
const triggerEventRef = ref();
const templateRef = ref();
const templateBRef = ref();
const audienceRef = ref();
const scheduleRef = ref();
const errors = ref({});
const temp = ref(null);
const tempB = ref(null);
const templateList = ref([]);

const campaignId = route.params.id;
const loadCampaign = async () => {
  try {
    isLoading.value = true;

    const response = await appEngagementsStore.fetchFilter({
      id: campaignId,
    });

    const data = response.data.data;

    Object.assign(campaign, {
      title: data.title,
      audience: data.audience || campaign.audience,
      triggerFilter: data.triggerFilter || campaign.triggerFilter,
      filter: data.filter || campaign.filter,
      abTesting: data.abTesting || campaign.abTesting,
      journey: data.journey || campaign.journey,
    });

    if (data.schedule) Object.assign(campaign.schedule, data.schedule);
    if (data.action?.template) campaign.action.template = data.action.template;
    if (data.action?.templateB) campaign.action.templateB = data.action.templateB;

  } catch (error) {
    console.error(error);

    show({
      message: "Failed to load campaign",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

const clearError = (field) => {
  errors.value[field] = null;
};

const proceedToNextTab = async () => {
  activeTab.value += 1;
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
const campaignLoaded = ref(false);
onMounted(async () => {
//   await fetchTemplateList();
  await loadCampaign();
  campaignLoaded.value = true;
  // setInterval(()=> console.log("add page", templateRef?.isPreStep?.value, templateBRef?.isPreStep?.value), 10000);
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
            @update:modelValue="() => clearError('title')" disabled
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
          :class="{ 'error-tab': tabErrors[index] }"
        >
          <VIcon size="20" start :icon="item.icon" />
          {{ item.title }}
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
            class="ml-2" disabled
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
        <FilterBuilder
          v-model="campaign.triggerFilter"
          :ignoreCohortfilterType="true"
          :ignoreSlicefilterType="true"
          :ignoreProfileAttribute="true"
          :ignoreSystemAttribute="true"
          :readonly="true"
          ref="triggerEventRef"
        />
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
        <div v-if="campaignLoaded" v-show="!campaign.abTesting.enabled || activeTemplateVariant === 'A'">
          <Template ref="templateRef" :templateId="campaign.action.template.id" :readonly="true" />
        </div>
        <div v-if="campaignLoaded" v-show="campaign.abTesting.enabled && activeTemplateVariant === 'B'">
          <Template ref="templateBRef" :templateId="campaign.action.templateB.id" :readonly="true"  />
        </div>
      </VWindowItem>

      <!-- tab-audience -->
      <VWindowItem>
        <Audience
          ref="audienceRef"
          v-model="campaign.audience"
          v-model:filter="campaign.filter"
          v-model:abTesting="campaign.abTesting" :readonly="true"
        />
      </VWindowItem>

      <!-- tab-schedule -->
      <VWindowItem>
        <Schedule
          ref="scheduleRef"
          v-model="campaign.schedule"
          v-model:journey="campaign.journey" :readonly="true"
        />
      </VWindowItem>

      <!-- tab-goals -->
      <!-- <VWindowItem> Goals </VWindowItem> -->
    </VWindow>
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
</style>
