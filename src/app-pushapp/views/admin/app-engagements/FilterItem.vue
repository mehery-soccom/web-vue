<script setup>
import { ref } from "vue";
import FilterBuilder from "./FilterBuilder.vue";

const props = defineProps({
  element: { type: Object, required: true },
  index: { type: Number, required: true },
  level: { type: Number, default: 0 },
});
const emit = defineEmits(["remove", "update"]);

const hasError = ref(false);

// === Constants ===
const optionsMap = {
  /* Events */
  app_open: {
    type: "event",
    title: "App open",
    value: "app_open",
    freqFieldMeta: true,
  },
  page_open: {
    type: "event",
    title: "Page open",
    value: "page_open",
    inputFieldMeta: {
      type: "select",
      options: [{ title: "Login", value: "login" }],
    },
  },
  page_close: { type: "event", title: "Page close", value: "page_close" },
  widget_open: {
    type: "event",
    title: "widget open",
    value: "widget_open",
    inputFieldMeta: {
      type: "text",
    },
  },
  widget_close: { type: "event", title: "Widget close", value: "widget_close" },

  /* Attributes */
  platform: {
    type: "attribute",
    title: "Platform",
    value: "platform",
    inputFieldMeta: {
      type: "select",
      options: [
        { title: "iOS", value: "ios" },
        { title: "Android", value: "android" },
      ],
    },
  },
};
const options = Object.values(optionsMap);

const eventOptions = options.filter((o) => o.type === "event");
const attributeOptions = options.filter((o) => o.type === "attribute");

const eventOperators = [
  { title: "Is", value: "is" },
  { title: "Is not", value: "is_not" },
];
const attributeOperators = [
  { title: "Equals", value: "equals" },
  { title: "Not equals", value: "not_equals" },
];
const freqOperators = [
  { title: "Exactly", value: "exactly" },
  { title: "Less than", value: "less_than" },
  { title: "More than", value: "more_than" },
];

const freqPeriods = [
  { title: "Today", value: "today" },
  { title: "Yesterday", value: "yesterday" },
  { title: "In last 7 days", value: "last_7_days" },
  { title: "In last 30 days", value: "last_30_days" },
];

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
  if (optionsMap[el.field].inputFieldMeta && (!el.operator || !el.value))
    valid = false;
  if (
    el.filterType === "event" &&
    optionsMap[el.field].freqFieldMeta &&
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
        v-if="optionsMap[element.field]?.inputFieldMeta"
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
      <template v-if="optionsMap[element.field]?.inputFieldMeta">
        <AppSelect
          v-if="optionsMap[element.field]?.inputFieldMeta?.type === 'select'"
          v-model="element.value"
          :items="optionsMap[element.field]?.inputFieldMeta?.options || []"
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
          optionsMap[element.field]?.freqFieldMeta
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
