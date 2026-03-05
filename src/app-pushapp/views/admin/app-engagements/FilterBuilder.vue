<script setup>
import { ref, nextTick } from "vue";
import FilterItem from "./FilterItem.vue";

const props = defineProps({
  modelValue: { type: Object, required: true },
  level: { type: Number, default: 0 },
  ignoreEventfilterType: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "delete-group"]);

const childRefs = ref([]);

// Add/remove
const addFilter = () => {
  props.modelValue.children.push({
    type: "filter",
    filterType: null,
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

// util
async function asyncEvery(array, predicate) {
  for (const [index, element] of array.entries()) {
    // Await the result of the async predicate
    const result = await predicate(element, index);
    if (!result) {
      return false; // Stop immediately if any element fails the test
    }
  }
  return true; // All elements passed the test
}

// Recursive validation + auto-scroll to first invalid
const isValid = async (silent = false) => {
  let firstInvalid = null;
  const allValid = await asyncEvery(
    props.modelValue.children,
    async (child, idx) => {
      const refComp = childRefs.value[idx];
      if (!refComp) return false;
      const valid = await refComp.isValid(silent);
      if (!valid && !firstInvalid) firstInvalid = refComp;
      return valid;
    },
  );

  if (!allValid && firstInvalid && !silent) {
    await nextTick();
    firstInvalid.$el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return allValid;
};

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
        :ignoreEventfilterType="ignoreEventfilterType"
      />
    </div>

    <!-- Actions -->
    <div class="d-flex gap-2 mt-3">
      <VBtn size="small" variant="tonal" color="primary" @click="addFilter">
        <VIcon start>mdi-plus</VIcon> Add Filter
      </VBtn>
      <VBtn size="small" variant="tonal" color="primary" @click="addGroup">
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
