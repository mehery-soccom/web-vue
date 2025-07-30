<script setup>
import { ref } from "vue";
import FilterBuilder from "./FilterBuilder.vue";

const props = defineProps({
  element: { type: Object, required: true },
  index: { type: Number, required: true },
  level: { type: Number, default: 0 },
});
const emit = defineEmits(["remove", "update"]);

// === Local state ===
const hasError = ref(false);

// === Constants (local to item) ===
const eventOptions = [
  { title: "PAGE_ENTERED", value: "PAGE_ENTERED" },
  { title: "PAGE_EXITED", value: "PAGE_EXITED" },
  { title: "APP_OPENED", value: "APP_OPENED" },
];
const attributeOptions = [{ title: "platform", value: "platform" }];
const operatorOptions = {
  event: [
    { title: "is", value: "is" },
    { title: "is not", value: "is not" },
  ],
  attribute: [
    { title: "equals", value: "equals" },
    { title: "not equals", value: "not equals" },
  ],
};
const valueFieldMeta = {
  platform: {
    type: "select",
    options: [
      { title: "iOS", value: "iOS" },
      { title: "Android", value: "Android" },
    ],
  },
  PAGE_ENTERED: {
    type: "select",
    options: [
      { title: "Login", value: "Login" },
      { title: "Home", value: "Home" },
    ],
  },
  PAGE_EXITED: {
    type: "select",
    options: [
      { title: "Login", value: "Login" },
      { title: "Home", value: "Home" },
    ],
  },
};
const freqOperators = [
  { title: "exactly", value: "exactly" },
  { title: "less than", value: "less than" },
  { title: "more than", value: "more than" },
];
const freqPeriods = [
  { title: "today", value: "today" },
  { title: "yesterday", value: "yesterday" },
  { title: "In last 7 days", value: "In last 7 days" },
  { title: "In last 30 days", value: "In last 30 days" },
];
const freqFieldMeta = {
  APP_OPENED: true,
};

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
  if (valueFieldMeta[el.field] && !el.operator && !el.value) valid = false;
  if (
    el.filterType === "event" &&
    freqFieldMeta[el.field] &&
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
      class="d-flex flex-wrap gap-2 pa-3 rounded-lg mb-2 border position-relative"
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
        :items="eventOptions"
        placeholder="Select Event"
        class="filter-entity field"
        @update:modelValue="clearErrorAndUpdate"
      />
      <AppSelect
        v-else
        v-model="element.field"
        :items="attributeOptions"
        placeholder="Select Attribute"
        class="filter-entity field"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Operator -->
      <AppSelect
        v-if="valueFieldMeta[element.field]"
        v-model="element.operator"
        :items="operatorOptions[element.filterType] || []"
        placeholder="Select Operator"
        class="filter-entity operator"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Value -->
      <template v-if="valueFieldMeta[element.field]">
        <AppSelect
          v-if="valueFieldMeta[element.field]?.type === 'select'"
          v-model="element.value"
          :items="valueFieldMeta[element.field]?.options || []"
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
        v-if="element.filterType === 'event' && freqFieldMeta[element.field]"
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
      <VTooltip location="top">
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
  width: 120px;
}
.field {
  width: 220px;
}
.operator {
  width: 140px;
}
.value {
  width: 220px;
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
