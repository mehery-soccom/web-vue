<script setup>
const { show } = inject("snackbar");

const route = useRoute();
const PARAM_ID = route.params.id;
const QUERY_COPY = route.query.copy;

const router = useRouter();

const isLoading = ref(false);
const isPreStep = ref(false);
const activeTemplateTab = ref("tab-details");
const template = reactive({
  type: null,
  subType: null,
  desc: "",
  code: "",
  style: {
    code: null,
  },
  model: {
    data: {},
  },
});
const view = ref({
  platform: "ios",
  mode: "collapse",
  appearance: "light",
});
const templatePreview = computed(() => {
  return {
    view: view.value,
    ...template,
    options: {
      buttons: buttonGroupFields.value,
    },
  };
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
  {
    title: "Goals",
    icon: "tabler-link",
    tab: "tab-goals",
  },
];

onMounted(async () => {});

const sanitizeAndUnderscore = (str) => {
  return str.replace(/[^\w\s]/g, "").replace(/\s+/g, "_");
};

watch(
  () => template.desc,
  (val) => {
    template.code = sanitizeAndUnderscore(val);
  }
);
</script>

<template>
  <div>
    <VTabs v-model="activeTab" class="v-tabs-pill">
      <VTab v-for="item in tabs" :key="item.icon" :value="item.tab">
        <VIcon size="20" start :icon="item.icon" />
        {{ item.title }}
      </VTab>
    </VTabs>

    <VWindow
      v-model="activeTab"
      class="mt-5 disable-tab-transition"
      :touch="false"
    >
      <!-- tab-template -->
      <VWindowItem value="tab-template">
        <v-row>
          <!-- Pre step -->
          <v-col v-if="isPreStep" cols="12" md="12">
            <VCard>Pre step</VCard>
          </v-col>

          <!-- Form Column -->
          <v-col v-if="!isPreStep" cols="12" md="8">
            <v-card>
              <v-card-item class="pb-0">
                <v-card-title>Create Template</v-card-title>
                <v-card-subtitle
                  >This template will be used for sending Push
                  Notification</v-card-subtitle
                >
              </v-card-item>

              <VTabs v-model="activeTemplateTab">
                <VTab value="tab-details"> Details </VTab>
                <VTab value="tab-variables"> Variables </VTab>
              </VTabs>

              <VCard flat>
                <VCardText>
                  <VWindow
                    v-model="activeTemplateTab"
                    class="disable-tab-transition"
                  >
                    <VWindowItem value="tab-details"> Form </VWindowItem>

                    <VWindowItem value="tab-variables"> Variables </VWindowItem>
                  </VWindow>
                </VCardText>

                <VDivider />

                <VCardText class="d-flex gap-4">
                  <VBtn :disabled="isLoading">{{
                    isLoading ? "loading..." : PARAM_ID ? "Update" : "Create"
                  }}</VBtn>
                  <VBtn
                    variant="tonal"
                    color="secondary"
                    :to="{ name: 'admin-app-engagements-templates-list' }"
                  >
                    Cancel
                  </VBtn>
                </VCardText>
              </VCard>
            </v-card>
          </v-col>

          <!-- Preview Column -->
          <VCol v-if="!isPreStep" cols="12" md="4">
            <VCard>Preview</VCard>
          </VCol>
        </v-row>
      </VWindowItem>

      <!-- tab-audience -->
      <VWindowItem value="tab-audience"> Audience </VWindowItem>

      <!-- tab-scheduling -->
      <VWindowItem value="tab-scheduling"> Scheduling </VWindowItem>

      <!-- tab-goals -->
      <VWindowItem value="tab-goals"> Goals </VWindowItem>
    </VWindow>
  </div>
</template>

<style scoped lang="scss"></style>
