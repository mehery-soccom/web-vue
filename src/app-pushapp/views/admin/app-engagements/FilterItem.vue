<script setup>
import { ref } from "vue";
import FilterBuilder from "./FilterBuilder.vue";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";

const props = defineProps({
  element: { type: Object, required: true },
  index: { type: Number, required: true },
  level: { type: Number, default: 0 },
});
const emit = defineEmits(["remove", "update"]);

const hasError = ref(false);

// === Constants ===
const {
  FILTER_OPTIONS_MAP,
  FILTER_EVENT_OPTIONS,
  FILTER_ATTRIBUTE_OPTIONS,
  eventOperators,
  attributeOperators,
  freqOperators,
  freqPeriods,
} = useAppEngagements();

// === Clear error on change ===
const clearErrorAndUpdate = () => {
  hasError.value = false;
  emit("update", props.element);
};

// === Validation ===
const isValid = (silent = false) => {
  const el = props.element;
  let valid = true;
  if (!el.field) valid = false;
  if (
    FILTER_OPTIONS_MAP[el.field]?.inputFieldMeta &&
    (!el.operator || !el.value)
  )
    valid = false;
  if (
    el.filterType === "event" &&
    FILTER_OPTIONS_MAP[el.field]?.freqFieldMeta &&
    (!el.freqOperator || !el.freqCount || !el.freqPeriod)
  )
    valid = false;

  if (!valid && !silent) hasError.value = true;
  return valid;
};

watch(
  () => props.element.filterType,
  (newType) => {
    props.element.field = null;
    props.element.operator = null;
    props.element.value = null;
    props.element.freqOperator = null;
    props.element.freqCount = null;
    props.element.freqPeriod = null;

    clearErrorAndUpdate();
  }
);

defineExpose({ isValid });
</script>

<template>
  <div>
    <!-- Filter Row -->
    <div
      v-if="element.type === 'filter'"
      class="d-flex flex-wrap gap-2 pa-3 rounded-lg mb-2 position-relative"
      :class="hasError ? 'border-red' : 'border-grey-lighten-1'"
    >
      <!-- Type -->
      <AppSelect
        v-model="element.filterType"
        :items="['event', 'attribute']"
        placeholder="Select Type"
        density="compact"
        class="filter-entity filter-type"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Field -->
      <AppSelect
        v-if="element.filterType === 'event'"
        v-model="element.field"
        :items="FILTER_EVENT_OPTIONS"
        placeholder="Select Event"
        class="filter-entity field"
        @update:modelValue="clearErrorAndUpdate"
      />
      <AppSelect
        v-else
        v-model="element.field"
        :items="FILTER_ATTRIBUTE_OPTIONS"
        placeholder="Select Attribute"
        class="filter-entity field"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Operator -->
      <AppSelect
        v-if="FILTER_OPTIONS_MAP[element.field]?.inputFieldMeta"
        v-model="element.operator"
        :items="
          element.filterType === 'event'
            ? eventOperators
            : element.filterType === 'attribute'
            ? attributeOperators
            : []
        "
        placeholder="Operator"
        class="filter-entity operator"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Value -->
      <template v-if="FILTER_OPTIONS_MAP[element.field]?.inputFieldMeta">
        <AppSelect
          v-if="
            FILTER_OPTIONS_MAP[element.field]?.inputFieldMeta?.type === 'select'
          "
          v-model="element.value"
          :items="
            FILTER_OPTIONS_MAP[element.field]?.inputFieldMeta?.options || []
          "
          placeholder="Select Value"
          class="filter-entity value"
          :disabled="!element.field"
          @update:modelValue="clearErrorAndUpdate"
        />
        <AppTextField
          v-else
          v-model="element.value"
          placeholder="Enter Value"
          class="filter-entity value"
          :disabled="!element.field"
          @update:modelValue="clearErrorAndUpdate"
        />
      </template>

      <!-- Splitted Frequency (only for events) -->
      <div
        v-if="
          element.filterType === 'event' &&
          FILTER_OPTIONS_MAP[element.field]?.freqFieldMeta
        "
        class="d-flex align-center gap-2"
      >
        <AppSelect
          v-model="element.freqOperator"
          :items="freqOperators"
          class="filter-entity freq-operator"
          placeholder="Frequency"
          @update:modelValue="clearErrorAndUpdate"
        />
        <AppTextField
          v-model="element.freqCount"
          type="number"
          class="filter-entity freq-count"
          @update:modelValue="clearErrorAndUpdate"
        />
        <span class="text-caption">time(s)</span>
        <AppSelect
          v-model="element.freqPeriod"
          :items="freqPeriods"
          class="filter-entity freq-period"
          placeholder="Period"
          @update:modelValue="clearErrorAndUpdate"
        />
      </div>

      <!-- Delete -->
      <VTooltip location="top" v-if="index > 0">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            icon
            size="small"
            variant="text"
            color="error"
            class="ms-auto align-self-start"
            @click="emit('remove')"
          >
            <VIcon>mdi-delete</VIcon>
          </VBtn>
        </template>
        <span>Delete Filter</span>
      </VTooltip>
    </div>

    <!-- Nested Group -->
    <FilterBuilder
      v-else
      :model-value="element"
      :level="level + 1"
      @update:model-value="emit('update', $event)"
      @delete-group="emit('remove')"
    />
  </div>
</template>

<style scoped>
.border-red {
  border: 1px solid red !important;
}
.filter-type {
  max-width: 120px;
}
.field {
  max-width: 220px;
}
.operator {
  max-width: 140px;
}
.value {
  max-width: 220px;
}
.freq-operator {
  width: 140px;
}
.freq-count {
  width: 60px;
}
.freq-period {
  width: 160px;
}
</style>
