<script setup>
import { ref, nextTick } from "vue";
import FilterItem from "./FilterItem.vue";
const { show } = inject("snackbar");

const props = defineProps({
  modelValue: { type: Object, required: true },
  level: { type: Number, default: 0 },
});
const emit = defineEmits(["update:modelValue", "delete-group"]);

const childRefs = ref([]);

// Add/remove
const addFilter = () => {
  props.modelValue.children.push({
    type: "filter",
    filterType: "event",
    field: null,
    operator: null,
    value: null,
    freqOperator: null,
    freqCount: null,
    freqPeriod: null,
  });
  emit("update:modelValue", props.modelValue);
};
const addGroup = () => {
  props.modelValue.children.push({
    type: "group",
    conjunction: "and",
    children: [
      {
        type: "filter",
        filterType: "event",
        field: null,
        operator: null,
        value: null,
        freqOperator: null,
        freqCount: null,
        freqPeriod: null,
      },
    ],
  });
  emit("update:modelValue", props.modelValue);
};
const removeChild = (index) => {
  props.modelValue.children.splice(index, 1);
  emit("update:modelValue", props.modelValue);
};

// Recursive validation + auto-scroll to first invalid
const isValid = async (silent = false) => {
  let firstInvalid = null;
  const allValid = props.modelValue.children.every((child, idx) => {
    const refComp = childRefs.value[idx];
    if (!refComp) return false;
    const valid = refComp.isValid(silent);
    if (!valid && !firstInvalid) firstInvalid = refComp;
    return valid;
  });

  if (!allValid && firstInvalid && !silent) {
    await nextTick();
    firstInvalid.$el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  let structureValid = true;
  try {
    validateFilterStructure(props.modelValue);
  } catch (error) {
    structureValid = false;
    show({ message: error.message, color: "error" });
  }

  return allValid && structureValid;
};

function validateFilterStructure(
  node,
  parentConjunction = null,
  isRoot = true
) {
  if (!node) throw new Error("Empty filter node");

  if (node.type === "group") {
    const { conjunction, children } = node;
    if (!Array.isArray(children) || children.length === 0) {
      throw new Error("Group must have children");
    }

    // Check: If group has multiple event filters as direct children, it must be OR
    const directEventChildren = children.filter(
      (c) => c.type === "filter" && c.filterType === "event"
    );
    if (directEventChildren.length > 1 && conjunction !== "or") {
      throw new Error(
        "Groups containing multiple event filters must use 'or' conjunction"
      );
    }

    // If root AND: cannot directly contain more than one event filter
    if (isRoot && conjunction === "and" && directEventChildren.length > 1) {
      throw new Error(
        "Root AND group cannot contain multiple event filters directly"
      );
    }

    // Root must contain one event filter atleast
    if (isRoot && directEventChildren.length == 0) {
      throw new Error("Root group must have an event filter");
    }

    // Recurse into children
    children.forEach((child) =>
      validateFilterStructure(child, conjunction, false)
    );
    return true;
  }

  if (node.type === "filter") {
    // No special checks here — but could enforce supported filterTypes
    if (!["event", "attribute"].includes(node.filterType)) {
      throw new Error(`Unsupported filterType: ${node.filterType}`);
    }
    return true;
  }

  throw new Error(`Unsupported node type: ${node.type}`);
}

defineExpose({ isValid });
</script>

<template>
  <div class="pa-3 rounded-lg border mb-3">
    <!-- Group Header -->
    <div class="d-flex align-center justify-space-between mb-3">
      <VBtnToggle
        v-model="modelValue.conjunction"
        density="compact"
        color="primary"
        divided
        mandatory
        v-if="level > 0 || modelValue.children.length > 1"
      >
        <VBtn value="and" size="small">AND</VBtn>
        <VBtn value="or" size="small">OR</VBtn>
      </VBtnToggle>
      <VTooltip location="top" v-if="level > 0">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            icon
            size="small"
            variant="text"
            color="error"
            @click="$emit('delete-group')"
          >
            <VIcon>mdi-folder-remove</VIcon>
          </VBtn>
        </template>
        <span>Delete Group</span>
      </VTooltip>
    </div>

    <!-- Filters & Groups -->
    <div v-for="(child, index) in modelValue.children" :key="index">
      <FilterItem
        :ref="(el) => (childRefs[index] = el)"
        :element="child"
        :index="index"
        :level="level"
        @remove="removeChild(index)"
        @update="emit('update:modelValue', modelValue)"
      />
    </div>

    <!-- Actions -->
    <div class="d-flex gap-2 mt-3">
      <VBtn size="small" variant="tonal" color="primary" @click="addFilter">
        <VIcon start>mdi-plus</VIcon> Add Filter
      </VBtn>
      <VBtn
        size="small"
        variant="tonal"
        color="primary"
        @click="addGroup"
        v-if="false"
      >
        <VIcon start>mdi-plus</VIcon> Add Group
      </VBtn>
    </div>
  </div>
</template>

<style scoped>
.border {
  border: 1px solid #ddd;
}
</style>
