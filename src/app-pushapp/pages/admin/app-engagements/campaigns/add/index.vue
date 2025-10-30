<script setup>
import Template from "@app-pushapp/pages/admin/app-engagements/templates/add/[[id]].vue";
import Audience from "@app-pushapp/views/admin/app-engagements/Audience.vue";
import Schedule from "@app-pushapp/views/admin/app-engagements/Schedule.vue";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";

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
  filter: {
    type: "group",
    conjunction: "and",
    children: [
      {
        type: "filter",
        filterType: "event",
        field: null,
        operator: "is",
        value: null,
        freqOperator: null,
        freqCount: null,
        freqPeriod: null,
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
    durationType: "manual",
    startDate: null,
    endDate: null,
    repeatType: null,
    repeatCount: null,
    repeatAfterDays: null,
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

const onSelectTemplate = (param = "t_edit") => {
  router.replace({
    query: {
      ...route.query,
      [param]: "6903443ed360e329e47a0571",
    },
  });
};

const clearError = (field) => {
  errors.value[field] = null;
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
      let templateValid = await templateRef.value?.isValid(silent);
      let templateBValid = campaign.abTesting.enabled
        ? await templateBRef.value?.isValid(silent)
        : true;
      if (!templateValid || !templateBValid) {
        valid = false;
      }
      break;
    case 1:
      let audienceValid = await audienceRef.value?.isValid(silent);
      if (!audienceValid) {
        valid = false;
      }
      break;
    case 2:
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

const create = async () => {
  try {
    isLoading.value = true;
    const valid = await isValid();
    if (valid) {
      const payload = {
        ...campaign,
      };
      const templateRes = await (route.query.t_edit
        ? templateRef.value._onUpdate()
        : templateRef.value.saveTemplate());
      payload.action.template.id = templateRes.data._id;
      payload.action.template.code = templateRes.data.code;
      payload.action.template.type = templateRes.data.type;
      payload.action.template.subType = templateRes.data.subType;
      if (campaign.abTesting.enabled) {
        const templateBRes = await (route.query.t_b_edit
          ? templateBRef.value._onUpdate()
          : templateBRef.value.saveTemplate());
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
</script>

<template>
  <div>
    <VToolbar flat class="px-4 mb-4 sticky-toolbar">
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
          <div class="mb-4 d-flex">
            <!-- select template -->
            <!-- @click="() => onSelectTemplate()" -->
          </div>
          <Template
            ref="templateRef"
            :edit="route.query.t_edit"
            :embedded="true"
          />
        </div>
        <div
          v-show="campaign.abTesting.enabled && activeTemplateVariant === 'B'"
        >
          <Template
            ref="templateBRef"
            :edit="route.query.t_b_edit"
            :embedded="true"
          />
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
        <Schedule ref="scheduleRef" v-model="campaign.schedule" />
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
