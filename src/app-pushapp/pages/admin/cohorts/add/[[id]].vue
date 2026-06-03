<script setup>
import { useCohortsStore } from "@app-pushapp/views/admin/cohorts/useCohortsStore";
import { useCohorts } from "@/app-pushapp/views/admin/cohorts/useCohorts";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";
const { show } = inject("snackbar");

const route = useRoute();
const router = useRouter();
const CohortsStore = useCohortsStore();
const { clearCache } = useAppEngagements();
const isLoading = ref(false);
const cohort = reactive({
  name: null,
  desc: null,
  filter: null,
});
const formRef = ref();
const filterRef = ref(null);

const onCreate = async () => {
  let validationResult = await formRef.value?.validate();
  if (!validationResult?.valid) return;

  let filtervalid = await filterRef.value?.isValid();
  let filterStructureValid = true;
  try {
    validateFilterStructure(cohort.filter, null, true, false, false, false);
  } catch (error) {
    filterStructureValid = false;
    show({ message: error.message, color: "error" });
  }
  if (!filtervalid || !filterStructureValid) return;

  try {
    isLoading.value = true;

    let payload = {
      ...cohort,
    };
    await CohortsStore.createCohort(payload);

    clearCache("cohort");

    show({ message: "Cohort created successfully", color: "success" });

    router.push({ name: "admin-cohorts-list" });
  } catch (error) {
    const apiErr = error.response.data;
    show({
      message:
        apiErr?.error?.message || apiErr?.message || "something went wrong",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (route.params.id) {
    CohortsStore.fetchCohort({ id: route.params.id })
      .then((response) => {
        const _cohort = response.data.data;
        Object.assign(cohort, {
          ...cohort,
          ..._cohort,
        });
      })
      .catch((error) => {
        const apiErr = error.response.data;
        show({
          message:
            apiErr?.error?.message || apiErr?.message || "something went wrong",
          color: "error",
        });
      });
  } else {
    cohort.filter = {
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
    };
  }
});
</script>

<template>
  <v-card>
    <v-card-item class="pb-0">
      <v-card-title
        >{{ route.params.id ? "View" : "Build" }} Cohort</v-card-title
      >
      <v-card-subtitle></v-card-subtitle>
    </v-card-item>

    <VCardText>
      <VForm ref="formRef" class="my-4">
        <VRow>
          <VCol cols="12" md="4">
            <AppTextField
              v-model="cohort.name"
              placeholder="Cohort name"
              :rules="[requiredValidator]"
              prepend-inner-icon="mdi-text-box"
              :readonly="!!route.params.id"
            />
          </VCol>
          <VCol cols="12" md="8">
            <AppTextField
              v-model="cohort.desc"
              placeholder="Optional Description"
              prepend-inner-icon="mdi-text-box"
              :readonly="!!route.params.id"
            />
          </VCol>
        </VRow>
      </VForm>
      <FilterBuilder
        v-if="cohort.filter"
        v-model="cohort.filter"
        :ignoreSlicefilterType="true"
        :ignoreCohortfilterType="true"
        ref="filterRef"
        :readonly="!!route.params.id"
      />
    </VCardText>

    <VCardText class="d-flex gap-4">
      <VBtn v-if="!route.params.id" @click="onCreate" :disabled="isLoading">{{
        isLoading ? "loading..." : "Create"
      }}</VBtn>
      <VBtn
        variant="tonal"
        color="secondary"
        :to="{ name: 'admin-cohorts-list' }"
      >
        Exit
      </VBtn>
    </VCardText>
  </v-card>
</template>

<style scoped lang="scss">
.template-form {
  height: inherit;
  overflow: scroll;
}
.text-style-toggle .v-btn {
  min-width: 56px;
  height: 36px;
}
.v-btn-group {
  height: 44px !important;
}
</style>
