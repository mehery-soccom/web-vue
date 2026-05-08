<script setup>
import { reactive, ref } from "vue";
import FilterBuilder from "./FilterBuilder.vue";
import AbTestingDetails from "./AbTestingDetails.vue";
const { show } = inject("snackbar");

const props = defineProps({
  modelValue: { type: Object, required: true },
  filter: { type: Object, required: true },
  abTesting: { type: Object, required: false },
});
const emit = defineEmits([
  "update:modelValue",
  "update:filter",
  "update:abTesting",
]);

// Clone object for internal form usage
const form = reactive(JSON.parse(JSON.stringify(props.modelValue)));
const filterLocal = reactive(JSON.parse(JSON.stringify(props.filter)));
const abTestingLocal = reactive(JSON.parse(JSON.stringify(props.abTesting)));

// Watch & sync
watch(
  () => props.modelValue,
  (val) => Object.assign(form, val),
  { deep: true },
);
watch(
  () => props.filter,
  (val) => Object.assign(filterLocal, val),
  { deep: true },
);
watch(
  () => props.abTesting,
  (val) => Object.assign(abTestingLocal, val),
  { deep: true },
);

// Watch & sync
watch(form, (val) => emit("update:modelValue", val), { deep: true });
watch(filterLocal, (val) => emit("update:filter", val), { deep: true });
watch(abTestingLocal, (val) => emit("update:abTesting", val), { deep: true });

const filterRef = ref(null);
const abTestingRef = ref(null);

const userSetOptions = [
  { title: "All Users", value: "All Users" },
  //   { title: "Segments", value: "Segments" },
];
const segmentConditionOptions = [
  { title: "any of these segments (Union)", value: "any" },
  { title: "all of these segments (Intersection)", value: "all" },
];
const segmentsOptions = [
  { title: "Segment 1", value: "1" },
  { title: "Segment 2", value: "2" },
];

function validateFilterStructure(
  node,
  parentConjunction = null,
  isRoot = true,
) {
  if (!node) throw new Error("Empty filter node");

  if (node.type === "group") {
    const { conjunction, children } = node;
    if (!Array.isArray(children) || children.length === 0) {
      throw new Error("Group must have children");
    }

    // Check: If group has multiple event filters as direct children, it must be OR
    const directEventChildren = children.filter(
      (c) => c.type === "filter" && c.filterType === "event",
    );
    if (directEventChildren.length > 1 && conjunction !== "or") {
      throw new Error(
        "Groups containing multiple event filters must use 'or' conjunction",
      );
    }

    // If root AND: cannot directly contain more than one event filter
    if (isRoot && conjunction === "and" && directEventChildren.length > 1) {
      throw new Error(
        "Root AND group cannot contain multiple event filters directly",
      );
    }

    // Root must contain one event filter atleast
    if (isRoot && directEventChildren.length == 0) {
      throw new Error("Root group must have an event filter");
    }

    // Recurse into children
    children.forEach((child) =>
      validateFilterStructure(child, conjunction, false),
    );
    return true;
  }

  if (node.type === "filter") {
    // No special checks here — but could enforce supported filterTypes
    if (
      !["event", "attribute", "additionalInfo", "slice", "cohort"].includes(
        node.filterType,
      )
    ) {
      throw new Error(`Unsupported filterType: ${node.filterType}`);
    }
    return true;
  }

  throw new Error(`Unsupported node type: ${node.type}`);
}

const isValid = async () => {
  let sections = await Promise.allSettled([
    filterRef.value?.isValid(),
    abTestingRef.value?.isValid() || true,
  ]);
  let sectionsValid = sections.every((r) => !!r.value);

  let filterStructureValid = true;
  try {
    validateFilterStructure(filterLocal);
  } catch (error) {
    filterStructureValid = false;
    show({ message: error.message, color: "error" });
  }

  return sectionsValid && filterStructureValid;
};

defineExpose({ isValid });
</script>

<template>
  <VCard class="pa-6 audience">
    <!-- <h3 class="mb-2">Segments</h3>
    <p class="text-caption mb-4">
      Select whether you want to target all users or specific segments
    </p>

    <VRow dense>
      <VCol cols="12" md="4">
        <AppSelect
          v-model="form.userSet"
          :items="userSetOptions"
          label="User Set"
          class="flex-grow-1 tiny-input"
        />
      </VCol>

      <template v-if="form.userSet === 'Segments'">
        <VCol cols="12" md="8"></VCol>

        <VCol cols="12" md="4">
          <AppSelect
            v-model="form.segmentCondition"
            :items="segmentConditionOptions"
            label="Include users who are in"
          />
        </VCol>

        <VCol cols="12" md="4">
          <AppSelect
            v-model="form.segment"
            :items="segmentsOptions"
            label="Segments"
            multiple
            chips
          />
        </VCol>

        <VCol cols="12" md="4"></VCol>

        <VCol cols="4">
          <VBtn variant="text" size="small" prepend-icon="mdi-plus">
            Add excluded users
          </VBtn>
        </VCol>
      </template>
    </VRow>

    <VDivider class="my-6" /> -->

    <h3 class="mb-2">Real-Time Filter</h3>
    <p class="text-caption mb-4">
      Apply filters based on app events and latest user attributes
    </p>

    <FilterBuilder
      v-model="filterLocal"
      ref="filterRef"
      :ignoreSlicefilterType="true"
    />

    <template v-if="abTestingLocal?.enabled">
      <VDivider class="my-6" />

      <h3 class="mb-2">A/B Testing</h3>
      <p class="text-caption mb-4">
        Test multiple versions of your template with a percentage of your
        audience
      </p>

      <AbTestingDetails v-model="abTestingLocal" ref="abTestingRef" />
    </template>
  </VCard>
</template>

<style>
.audience {
  .tiny-input .v-field__input {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    font-size: 1rem !important;
    min-height: 32px !important; /* instead of ~40px */
  }
}
</style>
