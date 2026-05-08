<script setup>
import { ref } from "vue";
import FilterBuilder from "./FilterBuilder.vue";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";

const props = defineProps({
  element: { type: Object, required: true },
  index: { type: Number, required: true },
  level: { type: Number, default: 0 },
  ignoreEventfilterType: { type: Boolean, default: false },
  ignoreSlicefilterType: { type: Boolean, default: false },
  ignoreCohortfilterType: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
});
const emit = defineEmits(["remove", "update"]);

const hasError = ref(false);

const furtherGroupRef = ref(null);
const datePresets = [
  { label: "Today", key: "today" },
  { label: "Tomorrow", key: "tomorrow" },
];

// === Constants ===
const {
  FILTER_TYPES,
  FILTER_FIELDS,
  FILTER_FIELDS_MAP,
  FILTER_OPERATORS,
  FILTER_PERIODS,
} = useAppEngagements(props.element);

// === Clear error on change ===
const clearErrorAndUpdate = () => {
  hasError.value = false;
  emit("update", props.element);
};

// === Validation ===
const isValid = async (silent = false) => {
  const el = props.element;
  let valid = true;

  if (el.type === "group") {
    valid = await furtherGroupRef.value?.isValid(silent);
  } else {
    if (!el.field) valid = false;
    if (
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta &&
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta?.required !== false &&
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta?.type !== "frequency" &&
      (!el.operator ||
        !el.value ||
        (Array.isArray(el.value) && !el.value.length))
    )
      valid = false;
    if (
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta &&
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta?.required !== false &&
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta?.type === "frequency" &&
      (!el.freqOperator || !el.freqCount || !el.freqPeriod)
    )
      valid = false;
    if (
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta?.type === "date" &&
      Array.isArray(el.value)
    ) {
      const v = el.value[0];
      if (!v?.stamp) {
        if (v?.offset === null || v?.offset === undefined || v?.offset === "") {
          valid = false;
        }
      }
    }
  }

  if (!valid && !silent) hasError.value = true;

  return valid;
};

watch(
  () => props.element.filterType,
  () => {
    props.element.field = null;
    props.element.operator = null;
    props.element.value = null;
    props.element.freqOperator = null;
    props.element.freqCount = null;
    props.element.freqPeriod = null;

    clearErrorAndUpdate();
  },
);
watch(
  () => props.element.field,
  () => {
    props.element.operator = null;
    props.element.value = null;
    props.element.freqOperator = null;
    props.element.freqCount = null;
    props.element.freqPeriod = null;

    clearErrorAndUpdate();
  },
);

defineExpose({ isValid });
</script>

<template>
  <div>
    <!-- Filter Row -->
    <div
      v-if="element.type === 'filter'"
      class="d-flex flex-wrap gap-2 pa-3 rounded-lg mb-2 position-relative"
      :class="[
        hasError ? 'border-red' : 'border-grey-lighten-1',
        { readonly: readonly },
      ]"
    >
      <!-- Type -->
      <AppSelect
        v-model="element.filterType"
        :items="
          FILTER_TYPES.filter(
            (f) =>
              (ignoreEventfilterType ? f.value !== 'event' : true) &&
              (ignoreSlicefilterType ? f.value !== 'slice' : true) &&
              (ignoreCohortfilterType ? f.value !== 'cohort' : true),
          )
        "
        placeholder="Select Type"
        density="compact"
        class="filter-entity filter-type"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Field -->
      <AppSelect
        v-model="element.field"
        :items="FILTER_FIELDS"
        :placeholder="element.filterType === 'slice' ? 'Select slice' : element.filterType === 'cohort' ? 'Select cohort' : 'Select field'"
        class="filter-entity field"
        @update:modelValue="clearErrorAndUpdate"
      >
        <template #item="{ props, item }">
          <VListItem v-bind="props">
            <VListItemSubtitle class="ml-auto text-xs text-gray-500">
              <span v-if="item.raw.meta?.projection != null">
                Projection : {{ item.raw.meta?.projection }}
              </span>
            </VListItemSubtitle>
          </VListItem>
        </template>
      </AppSelect>

      <!-- Operator -->
      <AppSelect
        v-if="
          FILTER_FIELDS_MAP[element.field]?.inputFieldMeta &&
          FILTER_FIELDS_MAP[element.field]?.inputFieldMeta?.type !== 'frequency'
        "
        v-model="element.operator"
        :items="FILTER_OPERATORS"
        placeholder="Operator"
        class="filter-entity operator"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Value -->
      <template v-if="FILTER_FIELDS_MAP[element.field]?.inputFieldMeta">
        <AppSelect
          v-if="
            FILTER_FIELDS_MAP[element.field]?.inputFieldMeta?.type ===
              'select' ||
            FILTER_FIELDS_MAP[element.field]?.inputFieldMeta?.type ===
              'dropdown'
          "
          v-model="element.value"
          :items="
            FILTER_FIELDS_MAP[element.field]?.inputFieldMeta?.options || []
          "
          placeholder="Select Value"
          class="filter-entity value"
          :multiple="true"
          :clearable="true"
          @update:modelValue="clearErrorAndUpdate"
        >
          <template #item="{ props, item }">
            <VListItem v-bind="props">
              <VListItemSubtitle class="ml-auto text-xs text-gray-500">
                <span v-if="item.raw.meta?.type">
                  Type : {{ item.raw.meta?.type }}
                </span>
                <span v-if="item.raw.meta?.type && item.raw.meta?.page">
                  |
                </span>
                <span v-if="item.raw.meta?.page">
                  Page : {{ item.raw.meta?.page }}
                </span>
              </VListItemSubtitle>
            </VListItem>
          </template>
        </AppSelect>
        <div
          v-else-if="
            FILTER_FIELDS_MAP[element.field]?.inputFieldMeta?.type ===
            'frequency'
          "
          class="d-flex align-center gap-2"
        >
          <AppSelect
            v-model="element.freqOperator"
            :items="FILTER_OPERATORS"
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
            :items="FILTER_PERIODS"
            class="filter-entity freq-period"
            placeholder="Period"
            @update:modelValue="clearErrorAndUpdate"
          />
        </div>
        <MyBooleanPicker
          v-else-if="
            FILTER_FIELDS_MAP[element.field]?.inputFieldMeta?.type === 'boolean'
          "
          v-model="element.value"
          @update:modelValue="clearErrorAndUpdate"
        />
        <MyDateTimePicker
          v-else-if="
            FILTER_FIELDS_MAP[element.field]?.inputFieldMeta?.type === 'date'
          "
          :mode="element.operator === 'BETWEEN' ? 'range' : 'single'"
          v-model="element.value"
          :relative-presets="datePresets"
          placeholder="Select Date"
          clearable
          @update:modelValue="clearErrorAndUpdate"
          class="filter-entity date-pick"
        />
        <AppTextField
          v-else
          v-model="element.value"
          placeholder="Enter Value"
          class="filter-entity value"
          @update:modelValue="clearErrorAndUpdate"
        />
      </template>

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
      ref="furtherGroupRef"
      :model-value="element"
      :level="level + 1"
      @update:model-value="emit('update', $event)"
      @delete-group="emit('remove')"
      :ignoreEventfilterType="ignoreEventfilterType"
      :ignoreSlicefilterType="ignoreSlicefilterType"
      :ignoreCohortfilterType="ignoreCohortfilterType"
    />
  </div>
</template>

<style scoped>
.border-red {
  border: 1px solid red !important;
}
.filter-type {
  max-width: 180px;
}
.field {
  max-width: 220px;
}
.operator {
  max-width: 140px;
}
.value {
  max-width: 250px;
}
.date-pick {
  max-width: 550px;
  display: flex;
}
.freq-operator {
  width: 140px;
}
.freq-count {
  width: 90px;
}
.freq-period {
  width: 160px;
}

/* disable only interactive elements */
.readonly .v-btn,
.readonly .filter-entity {
  pointer-events: none;
}
</style>
