<script setup>
import FlowEditor from "@/app-pushapp/views/admin/journeys/Floweditor.vue";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";
import { useFlowsStore } from '@/app-pushapp/views/admin/journeys/useFlowsStore'

const FlowsStore = useFlowsStore();
const route = useRoute();
const router = useRouter();
const { show } = inject("snackbar");
const isLoading = ref(false);
const isFetching = ref(false);
const flowRecord = ref(null);
const isViewMode = computed(() => !!route.params.id);

const flow = reactive({
  name: "",
  desc: "",
  filter: {
    type: "group",
    conjunction: "and",
    children: [
      {
        type: "filter",
        filterType: null,
        field: null,
        operator: null,
        value: null,
        freqOperator: null,
        freqCount: null,
        freqPeriod: null,
      },
    ],
  },
  flow: {},
  flowRenderer: {
    drawflow: {
      Home:{}
    }
  }
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

const clearError = field => {
  errors.value[field] = null;
};

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
        if (!silent) show({ message: error.message, color: "error",});
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

  const tabsValid = tabResults.every(r => !!r.value);
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
      const summary = flowValidation.errors.map(e => `${e.label}: ${e.messages.join(', ')}`).join(' • ');
      show({ message: `Fix the highlighted nodes — ${summary}`, color: 'error'});
      return;
    }
    tabErrors.value[1] = false;

    const editorPayload = flowEditorRef.value.buildFlowPayload()
    const payload = {
      name: flow.name,
      desc: flow.desc,
      filter: flow.filter,
      ...editorPayload,
    }
    await FlowsStore.createFlow(payload)

    show({ message: "Flow launched successfully", color: "success" });
    router.push({ name: "admin-journey-list",});
  }
  catch (e) {
    console.log(e);
    show({ message: "Failed to launch flow", color: "error" });
  }
  finally {
    isLoading.value = false;
  }
}
async function loadRecordIntoForm(record) {
  if (!record) return;
  flow.name = record.name || "";
  flow.desc = record.desc || "";
  flow.flow = record.flow || {};
  flow.flowRenderer = record.flowRenderer || { drawflow: { Home: {} } };
  if (record.filter) Object.assign(flow.filter, structuredClone(record.filter));
}

onMounted(async () => {
  if (!route.params.id) return;
  try {
    isFetching.value = true;
    const response = await FlowsStore.fetchFlow({ id: route.params.id });
    flowRecord.value = response.data.data;
    // console.log("data", JSON.parse(JSON.stringify(flowRecord.value)));
    await loadRecordIntoForm(flowRecord.value);
  } catch (e) {
    console.log(e);
    show({ message: "Failed to load flow", color: "error" });
  } finally {
    isFetching.value = false;
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
        <VIcon
          size="28"
          class="mr-3"
          color="primary"
        >
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
              :disabled="isViewMode"
            />
          </VCol>
        </VRow>
      </div>

      <!-- Right -->
      <div class="d-flex align-center gap-2 ml-auto">
        <VBtn variant="tonal" color="secondary" :to="{ name: 'admin-journey-list' }"> Exit </VBtn>

        <VBtn v-if="nextTab" color="primary" @click="proceedToNextTab">
          {{ nextTab }}
          <VIcon end icon="mdi-arrow-right"/>
        </VBtn>

        <VBtn v-else color="success" :loading="isLoading" v-if="!isViewMode" @click="launchFlow">
          Launch Flow
          <VIcon end icon="mdi-check"/>
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
        <h3 class="mb-2">Real-Time Filter</h3>
        <p class="text-caption mb-4">
          Apply filters based on latest user attributes
        </p>
        <FilterBuilder
          v-model="flow.filter"
          :ignoreEventfilterType="true"
          :ignoreEventDatafilterType="true"
          :ignoreCustomEventfilterType="true"
          :ignoreCohortfilterType="true"
          :ignoreSlicefilterType="true"
          :readonly="isViewMode"
          ref="filterRef"
        />
      </VWindowItem>

      <!-- Flow -->
      <VWindowItem>
        <FlowEditor ref="flowEditorRef" :initial-flow="flowRecord" :disabled="isViewMode"/>
      </VWindowItem>
    </VWindow>
  </div>
</template>

<style scoped>
.error-tab {
  color: rgb(var(--v-theme-error));
}
</style>