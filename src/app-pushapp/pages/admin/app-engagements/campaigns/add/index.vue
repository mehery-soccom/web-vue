<script setup>
import CreateTemplate from "@/app-pushapp/pages/admin/app-engagements/templates/add/[[id]].vue";

const { show } = inject("snackbar");

const route = useRoute();
const QUERY_COPY = route.query.c_copy;

const router = useRouter();

const isLoading = ref(false);
const campaign = reactive({
  title: "",
});
const activeTab = ref("tab-template");
const tabs = [
  {
    title: "Template",
    icon: "tabler-user-check",
    tab: "tab-template",
  },
  {
    title: "Audience",
    icon: "tabler-users",
    tab: "tab-audience",
  },
  {
    title: "Scheduling",
    icon: "tabler-layout-grid",
    tab: "tab-scheduling",
  },
  /*
  {
    title: "Goals",
    icon: "tabler-link",
    tab: "tab-goals",
  },
  */
];

onMounted(async () => {});
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
        <!-- <VBtn variant="outlined" color="primary"> Save Changes </VBtn> -->
        <VBtn color="primary">
          Proceed to { next tab }
          <VIcon end icon="mdi-arrow-right" />
        </VBtn>
      </div>
    </VToolbar>

    <VTabs v-model="activeTab" class="v-tabs-pill">
      <VTab v-for="item in tabs" :key="item.icon" :value="item.tab">
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
      <VWindowItem value="tab-template">
        <CreateTemplate />
      </VWindowItem>

      <!-- tab-audience -->
      <VWindowItem value="tab-audience"> Audience </VWindowItem>

      <!-- tab-scheduling -->
      <VWindowItem value="tab-scheduling"> Scheduling </VWindowItem>

      <!-- tab-goals -->
      <!-- <VWindowItem value="tab-goals"> Goals </VWindowItem> -->
    </VWindow>
  </div>
</template>

<style scoped lang="scss">
.sticky-toolbar {
  background: white;
  border-bottom: 1px solid #eee;
}
</style>
