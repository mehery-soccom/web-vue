<script setup>
import { useCustomDashboardStore } from "@/app-pushapp/views/dashboards/custom/useCustomDashboardStore";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";
import FilterBuilder from "@/app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import AudienceCountCheck from "@/app-pushapp/views/admin/app-engagements/AudienceCountCheck.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";

const { show } = inject("snackbar");
const route = useRoute();
const router = useRouter();
const store = useCustomDashboardStore();
const { clearCache } = useAppEngagements();

const isLoading = ref(false);
const isFetching = ref(false);
const formRef = ref();
const filterRef = ref(null);
const isSyncingAudienceMode = ref(false);

const createInitialFilter = (mode = "filter") => ({
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
});

const collectFilterTypes = (node, types = []) => {
  if (!node) return types;
  if (node.type === "filter") types.push(node.filterType);
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectFilterTypes(child, types));
  }
  return types;
};

const getAudienceModeFromFilter = (filterNode) => {
  // const selectedTypes = collectFilterTypes(filterNode).filter(Boolean);
  // if (selectedTypes.length && selectedTypes.every((type) => type === "cohort")) {
  //   return "cohort";
  // }
  return "filter";
};

const form = reactive({
  title: "",
  description: "",
  icon: "tabler-chart-bar",
  filter: createInitialFilter("filter"),
});

const audienceMode = ref("filter");

const iconOptions = [
  { title: "Chart Bar", value: "tabler-chart-bar", icon: "tabler-chart-bar" },
  { title: "Users", value: "tabler-users", icon: "tabler-users" },
  { title: "User Group", value: "tabler-users-group", icon: "tabler-users-group" },
  { title: "Activity", value: "tabler-activity", icon: "tabler-activity" },
  { title: "Bell", value: "tabler-bell", icon: "tabler-bell" },
  { title: "Device Mobile", value: "tabler-device-mobile", icon: "tabler-device-mobile" },
  { title: "Target", value: "tabler-target", icon: "tabler-target" },
  { title: "Flame", value: "tabler-flame", icon: "tabler-flame" },
  { title: "Star", value: "tabler-star", icon: "tabler-star" },
  { title: "Heart", value: "tabler-heart", icon: "tabler-heart" },
  { title: "Eye", value: "tabler-eye", icon: "tabler-eye" },
  { title: "Click", value: "tabler-click", icon: "tabler-click" },
  { title: "Message", value: "tabler-message", icon: "tabler-message" },
  { title: "Rocket", value: "tabler-rocket", icon: "tabler-rocket" },
  { title: "Filter", value: "tabler-filter", icon: "tabler-filter" },
  { title: "Dashboard", value: "tabler-layout-dashboard", icon: "tabler-layout-dashboard" },
];

const isEdit = computed(() => !!route.params.id);
const pageTitle = computed(() => (isEdit.value ? "Edit Block" : "Add Block"));

const resetFilter = (mode = "filter") => {
  const initial = createInitialFilter(mode);
  form.filter.type = initial.type;
  form.filter.conjunction = initial.conjunction;
  form.filter.children.splice(0, form.filter.children.length, ...initial.children);
};

const ensureFilterIds = (node) => {
  if (!node) return node;
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      if (!child._id) child._id = crypto.randomUUID();
      ensureFilterIds(child);
    });
  }
  return node;
};

watch(audienceMode, (newMode, oldMode) => {
  if (isSyncingAudienceMode.value || newMode === oldMode) return;
  const switched =
    (oldMode === "cohort" && newMode === "filter") ||
    (oldMode === "filter" && newMode === "cohort");
  if (switched) resetFilter(newMode);
});

const validateAudienceFilter = async () => {
  const filterValid = await filterRef.value?.isValid();
  let filterStructureValid = true;
  try {
    validateFilterStructure(form.filter, null, true, false, false, false);
  } catch (error) {
    filterStructureValid = false;
    show({ message: error.message, color: "error" });
  }
  return !!(filterValid && filterStructureValid);
};

const onSave = async () => {
  const validationResult = await formRef.value?.validate();
  if (!validationResult?.valid) return;
  if (!(await validateAudienceFilter())) return;

  isLoading.value = true;
  try {
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || "",
      icon: form.icon || "tabler-chart-bar",
      filter: form.filter,
    };

    if (isEdit.value) {
      await store.updateDashboard({ id: route.params.id, ...payload });
      show({ message: "Block updated successfully", color: "success" });
    } else {
      await store.createDashboard(payload);
      show({ message: "Block created successfully", color: "success" });
    }

    clearCache("cohort");
    router.push({ name: "dashboards-custom-list" });
  } catch (error) {
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Something went wrong",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (!route.params.id) {
    resetFilter("filter");
    audienceMode.value = "filter";
    return;
  }

  isFetching.value = true;
  try {
    const res = await store.fetchDashboard({ id: route.params.id });
    const data = res?.data?.data || res?.data || {};
    form.title = data.title || "";
    form.description = data.description || "";
    form.icon = data.icon || "tabler-chart-bar";

    if (data.filter) {
      const cloned = ensureFilterIds(structuredClone(data.filter));
      form.filter.type = cloned.type;
      form.filter.conjunction = cloned.conjunction;
      form.filter.children.splice(
        0,
        form.filter.children.length,
        ...(cloned.children || []),
      );
      isSyncingAudienceMode.value = true;
      audienceMode.value = getAudienceModeFromFilter(cloned);
      await nextTick();
      isSyncingAudienceMode.value = false;
    } else {
      resetFilter("filter");
      audienceMode.value = "filter";
    }
  } catch (error) {
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Failed to load block",
      color: "error",
    });
    router.push({ name: "dashboards-custom-list" });
  } finally {
    isFetching.value = false;
  }
});
</script>

<template>
  <VCard>
    <VCardItem class="pb-0">
      <VCardTitle>{{ pageTitle }}</VCardTitle>
      <VCardSubtitle>
        Set a title, icon, and audience filter for this dashboard block
      </VCardSubtitle>
    </VCardItem>

    <VCardText v-if="isFetching" class="text-center py-12">
      <VProgressCircular indeterminate color="primary" size="40" />
    </VCardText>

    <template v-else>
      <VCardText>
        <VForm ref="formRef" class="my-2">
          <VRow>
            <VCol cols="12" md="5">
              <AppTextField
                v-model="form.title"
                label="Title"
                placeholder="Block title"
                :rules="[requiredValidator]"
                prepend-inner-icon="mdi-text-box"
              />
            </VCol>
            <VCol cols="12" md="4">
              <AppTextField
                v-model="form.description"
                label="Description"
                placeholder="Optional description"
                prepend-inner-icon="mdi-text-box"
              />
            </VCol>
            <VCol cols="12" md="3">
              <AppSelect
                v-model="form.icon"
                :items="iconOptions"
                item-title="title"
                item-value="value"
                label="Icon"
                :rules="[requiredValidator]"
              >
                <template #selection="{ item }">
                  <div class="d-flex align-center gap-2">
                    <VIcon :icon="item.raw.icon" size="18" />
                    <span>{{ item.title }}</span>
                  </div>
                </template>
                <template #item="{ props: itemProps, item }">
                  <VListItem v-bind="itemProps" :prepend-icon="item.raw.icon" />
                </template>
              </AppSelect>
            </VCol>
          </VRow>
        </VForm>

        <VDivider class="my-4" />

        <h3 class="mb-2">Audience Filter</h3>
        <p class="text-caption mb-4">
          Configure a real-time filter. This is used to calculate the user count on the block.
        </p>

        <!-- <VBtnToggle
          v-model="audienceMode"
          mandatory
          density="compact"
          color="primary"
          divided
          class="mb-6"
        >
          <VBtn value="cohort">Select Cohort</VBtn>
          <VBtn value="filter">Real-Time Filter</VBtn>
        </VBtnToggle> -->

        <FilterBuilder
          v-if="form.filter && audienceMode === 'cohort'"
          ref="filterRef"
          v-model="form.filter"
          :ignoreEventfilterType="true"
          :ignoreCustomEventfilterType="true"
          :ignoreEventDatafilterType="true"
          :ignoreSlicefilterType="true"
          :ignoreProfileAttribute="true"
          :ignoreSystemAttribute="true"
        />

        <FilterBuilder
          v-else-if="form.filter"
          ref="filterRef"
          v-model="form.filter"
          :ignoreSlicefilterType="true"
          :ignoreCohortfilterType="true"
        />
      </VCardText>

      <VCardText class="d-flex align-center gap-4 flex-wrap">
        <VBtn color="primary" :loading="isLoading" @click="onSave">
          {{ isEdit ? "Update" : "Create" }}
        </VBtn>
        <VBtn
          variant="tonal"
          color="secondary"
          :to="{ name: 'dashboards-custom-list' }"
        >
          Cancel
        </VBtn>
        <VSpacer />
        <AudienceCountCheck
          v-if="form.filter"
          :filter="form.filter"
          :validate="validateAudienceFilter"
        />
      </VCardText>
    </template>
  </VCard>
</template>
