<script setup>
const { show } = inject("snackbar");

const route = useRoute();
const PARAM_ID = route.params.t_id;
const QUERY_COPY = route.query.t_copy;

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
            <VWindow v-model="activeTemplateTab" class="disable-tab-transition">
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
</template>

<style scoped lang="scss"></style>
