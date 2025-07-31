<script setup>
import Template from "@app-pushapp/pages/admin/app-engagements/templates/add/[[id]].vue";
import Audience from "@app-pushapp/views/admin/app-engagements/Audience.vue";
import Scheduling from "@app-pushapp/views/admin/app-engagements/Scheduling.vue";

const { show } = inject("snackbar");

const route = useRoute();
const QUERY_COPY = route.query.c_copy;

const router = useRouter();

const isLoading = ref(false);
const campaign = reactive({
  title: "",
  template: {},
  audience: {
    userSet: "All Users",
    segmentCondition: "any",
    segment: null,
    filters: { type: "group", conjunction: "and", children: [] },
  },
  scheduling: {
    durationType: "paused",
    startDate: "",
    endDate: "",
    repeatType: "once",
    repeatCount: 1,
    repeatAfterDays: 1,
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
const audienceRef = ref();
const schedulingRef = ref();
const errors = ref({});

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
      if (!templateValid) {
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
      let schedulingValid = await schedulingRef.value?.isValid(silent);
      if (!schedulingValid) {
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
      const payload = {};
      console.log("all valid", payload);
    } else {
      show({ message: "Validation failure", color: "error" });
    }
  } catch (error) {
    console.log("create", error);
    show({ message: "Failed to create Campaign. Try again", color: "error" });
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
        <VBtn color="primary" v-if="nextTab" @click="proceedToNextTab">
          {{ nextTab }}
          <VIcon end icon="mdi-arrow-right" />
        </VBtn>
        <VBtn color="primary" v-else @click="create" :loading="isLoading">
          Save Changes <VIcon end icon="mdi-check"
        /></VBtn>
      </div>
    </VToolbar>

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
      <!-- tab-template -->
      <VWindowItem>
        <Template ref="templateRef" v-model="campaign.template" />
      </VWindowItem>

      <!-- tab-audience -->
      <VWindowItem>
        <Audience ref="audienceRef" v-model="campaign.audience" />
      </VWindowItem>

      <!-- tab-scheduling -->
      <VWindowItem>
        <Scheduling ref="schedulingRef" v-model="campaign.scheduling" />
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
