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
  scheduling: {},
});
watch(
  campaign,
  (val) => {
    console.log("campaign", val);
  },
  { immediate: true, deep: true }
);
const activeTab = ref(0);
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
const nextTab = computed(() => {
  const next = tabs[activeTab.value + 1];
  return next ? `Proceed to ${next.title}` : null;
});
const templateRef = ref();
const audienceRef = ref();
const schedulingRef = ref();

onMounted(async () => {});

const proceedToNextTab = async () => {
  const next = activeTab.value + 1;

  switch (activeTab.value) {
    case 0:
      console.log("proceeding to ", next);
      activeTab.value = next;
      break;
    case 1:
      console.log("proceeding to ", next);
      const valid = await audienceRef.value?.isValid();
      if (!valid) {
        console.log("Audience form is invalid!");
        return;
      } else {
        console.log("Audience form:", campaign.audience);
        activeTab.value = next;
      }
      break;

    default:
      break;
  }
};

const create = async () => {
  const results = await Promise.all([
    templateRef.value.isValid(),
    audienceRef.value.isValid(),
    schedulingRef.value.isValid(),
  ]);

  console.log("create", results);

  if (results.every((r) => !!r)) {
    console.log("all valid");
  } else {
    console.log("Validation failed");
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
            v-model="campaign.title"
            placeholder="Untitled Campaign"
            autofocus
          />
        </div>
      </div>

      <!-- Right Section: Actions -->
      <div class="d-flex align-center gap-2 ml-auto">
        <VBtn color="primary" v-if="nextTab" @click="proceedToNextTab">
          {{ nextTab }}
          <VIcon end icon="mdi-arrow-right" />
        </VBtn>
        <VBtn color="primary" v-else @click="create">
          Save Changes <VIcon end icon="mdi-check"
        /></VBtn>
      </div>
    </VToolbar>

    <VTabs v-model="activeTab" class="v-tabs-pill">
      <VTab v-for="(item, index) in tabs" :key="item.icon" :value="index">
        <VIcon size="20" start :icon="item.icon" />
        {{ item.title }}
      </VTab>
    </VTabs>

    <VWindow
      v-model="activeTab"
      class="mt-4 disable-tab-transition"
      :touch="false"
    >
      <!-- tab-template -->
      <VWindowItem>
        <Template ref="templateRef" />
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
</style>
