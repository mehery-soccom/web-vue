<script setup>
import { ref, nextTick, computed } from "vue";
import FilterItem from "./FilterItem.vue";

const props = defineProps({
  modelValue: { type: Object, required: true },
  level: { type: Number, default: 0 },
  ignoreEventfilterType: { type: Boolean, default: false },
  ignoreCustomEventfilterType: { type: Boolean, default: false },
  ignoreEventDatafilterType: { type: Boolean, default: false },
  ignoreSlicefilterType: { type: Boolean, default: false },
  ignoreCohortfilterType: { type: Boolean, default: false },
  ignoreProfileAttribute: { type: Boolean, default: false },
  ignoreSystemAttribute: { type: Boolean, default: false },
  hideActions: { type: Boolean, default: false },
  disableRemove: { type: Boolean, default: false },
  showScannedEvents: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  channelId: { type: [String, Number], default: null },
  vertical: { type: Boolean, default: false },
  rootFilter: { type: Object, default: null },
  connectedAppEvent: { type: String, default: null },
});
const emit = defineEmits(["update:modelValue", "delete-group"]);

const childRefs = ref([]);

// Add/remove
const addFilter = () => {
  props.modelValue.children.push({
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
  });
  emit("update:modelValue", props.modelValue);
};
const addGroup = () => {
  props.modelValue.children.push({
    _id: crypto.randomUUID(),
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
  emit("update:modelValue", props.modelValue);
};
const removeChild = (index) => {
  props.modelValue.children.splice(index, 1);
  emit("update:modelValue", props.modelValue);
};
const hasCohort = computed(() =>
  props.modelValue.children.some((c) => c.type === "filter" && c.filterType === "cohort" ),
);
const hasNormalFilter = computed(() =>
  props.modelValue.children.some((c) => c.type === "filter" && c.filterType && c.filterType !== "cohort" ),
);
const hasCustomEventInNode = (node, path = "root") => {
  if (!node) {
    return false;
  }
  if (node.type === "filter") {
    const result = node.filterType === "customEvent";
    return result;
  }
  if (node.type === "group") {
    const childResults = (node.children || []).map((child, index) =>
      hasCustomEventInNode(child, `${path}.children[${index}]`),
    );
    const result = childResults.some(Boolean);
    return result;
  }
  return false;
};

const hasCustomEventAbove = computed(() => {
  return props.modelValue.children.map((_, i) => {
    if (i === 0) return false;
    const prev = props.modelValue.children[i - 1];
    return hasCustomEventInNode(prev, `children[${i - 1}]`);
  });
});
const shouldIgnoreEventData = (index) => {
  const prev = index > 0 ? props.modelValue.children[index - 1] : null;
  const hasPreviousCustomEvent =
    index > 0 && hasCustomEventInNode(prev, `children[${index - 1}]`);
  const result =
    props.ignoreEventDatafilterType ||
    (!props.ignoreCustomEventfilterType &&
      !props.ignoreEventDatafilterType &&
      !hasPreviousCustomEvent);

  console.log("[shouldIgnoreEventData]", {
    level: props.level,
    index,
    prev,
    hasPreviousCustomEvent,
    ignoreCustomEventfilterType: props.ignoreCustomEventfilterType,
    ignoreEventDatafilterType: props.ignoreEventDatafilterType,
    result,
  });

  return result;
};

const connectedEventPairs = computed(() => {
  const pairs = new Set();
  for (let i = 1; i < props.modelValue.children.length; i++) {
    const prev = props.modelValue.children[i - 1];
    const curr = props.modelValue.children[i];
    if ( prev.type === 'filter' && prev.filterType === 'customEvent' &&
      curr.type === 'filter' && curr.filterType === 'eventData'
    ) {
      pairs.add(i);
    }
  }
  return pairs;
});
watch(() => props.modelValue.children.map(c => ({ filterType: c.filterType, field: c.field })),
  (newVals, oldVals) => {
    if (!oldVals) return;
    // console.log("watch trig", newVals)
    newVals.forEach((curr, i) => {
      const prev = oldVals[i];
      if (!prev) return;
      const child = props.modelValue.children[i];
      const next = props.modelValue.children[i + 1];
      // console.log("watch trig 2", newVals, child, next)

      if ( child.type === 'filter' && prev.filterType === 'customEvent' &&
        next?.type === 'filter' && next?.filterType === 'eventData' &&
        (curr.filterType !== prev.filterType || curr.field !== prev.field)
      ) {
        // console.log("watch trig 3", newVals)
        next.filterType = null;
        next.field = null;
        next.operator = null;
        next.value = null;
        next.freqOperator = null;
        next.freqCount = null;
        next.freqPeriod = null;
        emit('update:modelValue', props.modelValue);
      }
    });
  },
  { deep: true }
);

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
  <div
    class="pa-3 rounded-lg border mb-3"
    :class="{ 'readonly-container': readonly, 'vertical-group': vertical }"
  >
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
    <div v-for="(child, index) in modelValue.children" :key="child._id">
      <div v-if="connectedEventPairs.has(index)" class="d-flex align-center gap-1 px-3 py-0" style="margin-bottom: -4px;margin-top: -10px;">
        <div style="width:2px; height:16px; border-left: 2px dashed rgb(var(--v-theme-primary)); margin-left:12px;"></div>
        <VChip size="x-small" color="primary" variant="tonal" label style="font-size:12px; height:20px;">
          <VIcon start size="12">mdi-link-variant</VIcon>
          Event property of ↑
        </VChip>
      </div>
      <FilterItem
        :ref="(el) => (childRefs[index] = el)"
        :element="child"
        :index="index"
        :level="level"
        :vertical="vertical"
        :root-filter="rootFilter || modelValue"
        :connected-app-event="connectedAppEvent"
        @remove="removeChild(index)"
        @update="emit('update:modelValue', modelValue)"
        :ignoreEventfilterType="ignoreEventfilterType"
        :ignoreCustomEventfilterType="ignoreCustomEventfilterType"
        :ignoreEventDatafilterType="shouldIgnoreEventData(index)"
        :rawIgnoreEventDatafilterType="ignoreEventDatafilterType"
        :ignoreSlicefilterType="ignoreSlicefilterType"
        :ignoreCohortfilterType="ignoreCohortfilterType"
        :ignoreProfileAttribute="ignoreProfileAttribute"
        :ignoreSystemAttribute="ignoreSystemAttribute"
        :disableRemove="disableRemove"
        :readonly="readonly"
        :hasCohort="hasCohort"
        :hasNormalFilter="hasNormalFilter"
        :channelId="channelId"
        :showScannedEvents="showScannedEvents"
      />
    </div>

    <!-- Actions -->
    <div v-if="!hideActions" class="d-flex gap-2 mt-3">
      <VBtn size="small" variant="tonal" color="primary" @click="addFilter" :disabled="hasCohort">
        <VIcon start>mdi-plus</VIcon> Add Filter
      </VBtn>
      <VBtn size="small" variant="tonal" color="primary" @click="addGroup" :disabled="hasCohort">
        <VIcon start>mdi-plus</VIcon> Add Group
      </VBtn>
    </div>
  </div>
</template>

<style scoped>
.border {
  border: 1px solid #ddd;
}

.readonly-container {
  opacity: 0.9;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  transition: all 0.2s ease;
}

/* disable only interactive elements */
.readonly-container .v-btn {
  pointer-events: none;
  opacity: 0.7;
}
</style>
