<script setup>
import { ref, onMounted, nextTick } from "vue";
import FilterBuilder from "./FilterBuilder.vue";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { useLibraryStore } from "@/app-pushapp/views/config/library/useLibraryStore";
const libraryStore = useLibraryStore();

const props = defineProps({
  element: { type: Object, required: true },
  index: { type: Number, required: true },
  level: { type: Number, default: 0 },
  ignoreEventfilterType: { type: Boolean, default: false },
  ignoreCustomEventfilterType: { type: Boolean, default: false },
  ignoreEventDatafilterType: { type: Boolean, default: false },
  rawIgnoreEventDatafilterType: { type: Boolean, default: false },
  ignoreSlicefilterType: { type: Boolean, default: false },
  ignoreCohortfilterType: { type: Boolean, default: false },
  ignoreProfileAttribute: { type: Boolean, default: false },
  ignoreSystemAttribute: { type: Boolean, default: false },
  disableRemove: { type: Boolean, default: false },
  showScannedEvents: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  hasCohort: { type: Boolean, default: false },
  hasNormalFilter: { type: Boolean, default: false },
  channelId: { type: [String, Number], default: null },
  vertical: { type: Boolean, default: false },
  rootFilter: { type: Object, default: null },
  connectedAppEvent: { type: String, default: null },
});
const emit = defineEmits(["remove", "update"]);

const hasError = ref(false);
const showCohortConfirm = ref(false);
const pendingFilterType = ref(null);
const previousFilterType = ref(null);
const skipCohortCheck = ref(false);
const furtherGroupRef = ref(null);
const datePresets = [
  { label: "Today", key: "today" },
  // { label: "Tomorrow", key: "tomorrow" },
];
const channelId = computed(() => props.channelId);
// === Constants ===
const {
  FILTER_TYPES,
  FILTER_FIELDS,
  FILTER_FIELDS_MAP,
  FILTER_OPERATORS,
  FILTER_PERIODS,
  fetchFilterFields,
  fetchFilterFieldValues,
} = useAppEngagements(props.element, { onlyActiveCohorts: true, channelId });

// === Clear error on change ===
const clearErrorAndUpdate = () => {
  hasError.value = false;

  const inputType =
    FILTER_FIELDS_MAP[props.element.field]?.inputFieldMeta?.type;
  if (
    inputType === "number" &&
    props.element.value !== null &&
    props.element.value !== ""
  ) {
    props.element.value = Number(props.element.value);
  }

  if (props.element.freqCount !== null && props.element.freqCount !== "") {
    props.element.freqCount = Number(props.element.freqCount);
  }

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
        el.value === null ||
        el.value === undefined ||
        el.value === "" ||
        (Array.isArray(el.value) && !el.value.length))
    ) {
      valid = false;
    }
    if (
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta &&
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta?.required !== false &&
      el.filterType !== "customEvent" &&
      FILTER_FIELDS_MAP[el.field]?.inputFieldMeta?.type === "frequency" &&
      (!el.freqOperator || !el.freqCount || !el.freqPeriod)
    ) {
      valid = false;
    }
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
    // if (el.filterType === 'eventData' && !el.dataProperty) valid = false;
  }

  if (!valid && !silent) hasError.value = true;

  return valid;
};

watch(
  () => props.element.filterType,
  async (newVal, oldVal) => {
    if (newVal === "customEvent" || newVal === "eventData") {
      await fetchFilterFields({ type: newVal });
    }
    // console.log("clear values 4", props.element);
    if (newVal === oldVal || oldVal === null) return;
    props.element.field = null;
    props.element.operator = null;
    props.element.value = null;
    props.element.freqOperator = null;
    props.element.freqCount = null;
    props.element.freqPeriod = null;
    props.element.scannedEvents = null;
    clearErrorAndUpdate();

    if (!props.readonly) {
      if (skipCohortCheck.value) {
        skipCohortCheck.value = false;
        return;
      }
      if (newVal === "cohort" && props.hasNormalFilter) {
        previousFilterType.value = oldVal;
        pendingFilterType.value = newVal;
        showCohortConfirm.value = true;
        props.element.filterType = oldVal;
        return;
      }
    }
  },
);

watch(
  () => props.channelId,
  () => {
    if (props.element.filterType !== "slice") return;
    const exists = FILTER_FIELDS.value.some(
      (f) => f.value === props.element.field,
    );
    if (!exists) {
      props.element.field = null;
      props.element.operator = null;
      props.element.value = null;
      clearErrorAndUpdate();
    }
  },
);
watch(
  () => props.element.field,
  async (newVal, oldVal) => {
    if (!props.readonly && newVal !== oldVal && oldVal != null) {
      props.element.operator = null;
      props.element.value = null;
      props.element.freqOperator = null;
      props.element.freqCount = null;
      props.element.freqPeriod = null;

      clearErrorAndUpdate();
    }
    if (newVal === 'page_open') {
      if (!libraryStore.pageList.length && !libraryStore.pageListLoading) {
        libraryStore.pageListLoading = true;
        try {
          const response = await libraryStore.read({ id: "pages" });
          libraryStore.pageList = response.data.data.options || [];
        } catch (error) {
          console.error("Failed to fetch pages:", error);
        } finally {
          libraryStore.pageListLoading = false;
        }
      }
    } else if (newVal === 'widget_open') {
      if (!libraryStore.placeholderList.length && !libraryStore.placeholderListLoading) {
        libraryStore.placeholderListLoading = true;
        try {
          const response = await libraryStore.read({ id: "placeholders" });
          libraryStore.placeholderList = response.data.data.options || [];
        } catch (error) {
          console.error("Failed to fetch placeholders:", error);
        } finally {
          libraryStore.placeholderListLoading = false;
        }
      }
    }
  },
);

const findCustomEvent = (node, result = []) => {
  if (!node) return result;
  if (node.type === "filter" && node.filterType === "customEvent" && node.field)
    result.push(node.field);
  if (node.children)
    node.children.forEach((child) => findCustomEvent(child, result));

  return result;
};
const customEventIds = computed(() => findCustomEvent(props.rootFilter));
const eventDataFields = computed(() => {
  if (props.element.filterType !== "eventData") return [];

  const ids = customEventIds.value;
  const matchedDefs = Object.values(FILTER_FIELDS_MAP).filter((f) => {
    if (f.type !== "eventData") return false;
    if (ids.includes(f.eventId)) return true;
    if (props.connectedAppEvent && f.title === props.connectedAppEvent)
      return true;
    return false;
  });

  if (!matchedDefs.length) return [];
  return [
    ...new Set(matchedDefs.flatMap((e) => e.meta?.dataProperties || [])),
  ].map((p) => ({ title: p, value: p }));
});
const selectedFieldMeta = computed(() => {
  if (props.element.filterType === "eventData") {
    return {
      inputFieldMeta: {
        type: "text",
      },
    };
  }
  return FILTER_FIELDS_MAP[props.element.field];
});
const confirmCohortSelection = () => {
  skipCohortCheck.value = true;
  props.element.filterType = pendingFilterType.value;
  showCohortConfirm.value = false;
};

const cancelCohortSelection = () => {
  props.element.filterType = previousFilterType.value;
  showCohortConfirm.value = false;
};

const selectedFilterType = computed(() => {
  if (!props.element.filterType) return null;

  const valueObj = FILTER_TYPES.find(
    (t) =>
      t.value === props.element.filterType ||
      t.valueAlias === props.element.filterType,
  );

  return valueObj?.value || null;
});
function onFilterTypeChange(value) {
  props.element.filterType = value;

  clearErrorAndUpdate();
}
function onFilterFieldChange(value) {
  const field = FILTER_FIELDS.value.find((f) => f.value === value);
  if (field) {
    props.element.filterType = field.typeAlias ?? field.type;
  }
  nextTick(() => {
    props.element.field = value;
  });

  clearErrorAndUpdate();
}

onMounted(async () => {
  await fetchFilterFieldValues();
});

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
        {
          readonly: readonly,
          'disabled-filter': hasCohort && element.filterType !== 'cohort',
          'flex-column': vertical,
        },
      ]"
    >
      <!-- :items="
          FILTER_TYPES.filter(
            (f) =>
              (ignoreEventfilterType ? f.value !== 'event' : true) &&
              (ignoreSlicefilterType ? f.value !== 'slice' : true) &&
              (ignoreCohortfilterType ? f.value !== 'cohort' : true),
          )
        " -->
      <!-- Type -->
      <AppSelect
        :model-value="selectedFilterType"
        :items="
          FILTER_TYPES.filter((f) => {
            if (ignoreEventfilterType && f.value === 'event') return false;
            if (ignoreCustomEventfilterType && f.value === 'customEvent')
              return false;
            if (ignoreEventDatafilterType && f.value === 'eventData')
              return false;
            if (ignoreSlicefilterType && f.value === 'slice') return false;
            if (ignoreCohortfilterType && f.value === 'cohort') return false;
            if (ignoreProfileAttribute && f.value === 'additionalInfo') return false;
            if (ignoreSystemAttribute && f.value === 'attribute') return false;
            if (element.filterType === f.value) return true;
            if (hasNormalFilter && !element.filterType && f.value === 'cohort')
              return false;
            return true;
          })
        "
        placeholder="Select Type"
        density="compact"
        class="filter-entity filter-type"
        @update:modelValue="onFilterTypeChange"
      />

      <!-- Field -->
      <AppAutocomplete
        v-model="element.field"
        :items="
          element.filterType === 'eventData' ? eventDataFields : FILTER_FIELDS
        "
        :placeholder="
          element.filterType === 'slice'
            ? 'Select slice'
            : element.filterType === 'cohort'
            ? 'Select cohort'
            : 'Select field'
        "
        class="filter-entity field"
        @update:modelValue="onFilterFieldChange"
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
      </AppAutocomplete>

      <!-- <AppSelect
        v-if="element.filterType === 'eventData' && selectedFieldMeta"
        v-model="element.dataProperty"
        :items="selectedFieldMeta?.meta?.dataProperties || []"
        placeholder="Select Property"
        class="filter-entity data-property"
        @update:modelValue="clearErrorAndUpdate"
      /> -->

      <!-- Operator -->
      <AppAutocomplete
        v-if="
          selectedFieldMeta?.inputFieldMeta &&
          selectedFieldMeta?.inputFieldMeta?.type !== 'frequency'
        "
        v-model="element.operator"
        :items="FILTER_OPERATORS"
        placeholder="Operator"
        class="filter-entity operator"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Value -->
      <template v-if="selectedFieldMeta?.inputFieldMeta">
        <AppAutocomplete
          v-if="
            (selectedFieldMeta?.inputFieldMeta?.type === 'select' ||
              selectedFieldMeta?.inputFieldMeta?.type === 'dropdown') &&
            typeof selectedFieldMeta?.inputFieldMeta?.options === 'string'
          "
          v-model="element.value"
          :items="selectedFieldMeta?.inputFieldMeta?.options?.includes('pages')
            ? [...(libraryStore.$state.pageList || [])].sort((a, b) => a.label.localeCompare(b.label))
            : [...(libraryStore.$state.placeholderList || [])].sort((a, b) => a.label.localeCompare(b.label))"
          item-title="label"
          item-value="code"
          placeholder="Select Value"
          class="filter-entity value"
          :multiple="true"
          :clearable="true"
          @update:modelValue="clearErrorAndUpdate"
        />

        <AppAutocomplete
          v-else-if="
            selectedFieldMeta?.inputFieldMeta?.type === 'select' ||
            selectedFieldMeta?.inputFieldMeta?.type === 'dropdown'
          "
          v-model="element.value"
          :items="selectedFieldMeta?.inputFieldMeta?.options || []"
          placeholder="Select Value"
          class="filter-entity value"
          :multiple="!!selectedFieldMeta?.inputFieldMeta?.multiple"
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
        </AppAutocomplete>
        <div
          v-else-if="selectedFieldMeta?.inputFieldMeta?.type === 'frequency' && element.filterType !== 'customEvent'"
          class="d-flex align-center gap-2"
        >
          <AppAutocomplete
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
          v-else-if="selectedFieldMeta?.inputFieldMeta?.type === 'boolean'"
          v-model="element.value"
          @update:modelValue="clearErrorAndUpdate"
        />
        <MyDateTimePicker
          v-else-if="selectedFieldMeta?.inputFieldMeta?.type === 'date'"
          :mode="element.operator === 'BETWEEN' ? 'range' : 'single'"
          v-model="element.value"
          :relative-presets="datePresets"
          placeholder="Select Date"
          clearable :vertical="vertical"
          @update:modelValue="clearErrorAndUpdate"
          class="filter-entity date-pick"
          :style="{ flexDirection: vertical ? 'column' : 'row' }"
        />
        <AppTextField
          v-else-if="element.filterType !== 'customEvent'"
          v-model="element.value"
          :type="
            selectedFieldMeta?.inputFieldMeta?.type === 'number'
              ? 'number'
              : 'text'
          "
          placeholder="Enter Value"
          class="filter-entity value"
          @update:modelValue="clearErrorAndUpdate"
        />
      </template>

      <!-- Scanned Events -->
      <AppSelect
        v-if="showScannedEvents && element.filterType == 'eventData'"
        v-model="element.scannedEvents"
        :items="[
          { title: 'Once', value: 'once' },
          { title: 'All', value: 'all' },
        ]"
        placeholder="Events"
        density="compact"
        class="filter-entity scanned-events"
        @update:modelValue="clearErrorAndUpdate"
      />

      <!-- Delete -->
      <VTooltip location="top" v-if="index > 0 && !disableRemove">
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
      :vertical="vertical"
      :connected-app-event="connectedAppEvent"
      @update:model-value="emit('update', $event)"
      @delete-group="emit('remove')"
      :ignoreEventfilterType="ignoreEventfilterType"
      :ignoreEventDatafilterType="rawIgnoreEventDatafilterType"
      :ignoreCustomEventfilterType="ignoreCustomEventfilterType"
      :ignoreSlicefilterType="ignoreSlicefilterType"
      :ignoreCohortfilterType="ignoreCohortfilterType"
      :ignoreProfileAttribute="ignoreProfileAttribute"
      :ignoreSystemAttribute="ignoreSystemAttribute"
      :disableRemove="disableRemove"
      :showScannedEvents="showScannedEvents"
      :channelId="channelId"
      :readonly="readonly"
    />
    <VDialog v-model="showCohortConfirm" max-width="420">
      <VCard
        title="Use Cohort Filter?"
        text="Other filters will become ineligible if Cohort is selected."
      >
        <template #actions>
          <VSpacer />
          <VBtn text @click="cancelCohortSelection"> Cancel </VBtn>
          <VBtn color="primary" variant="tonal" @click="confirmCohortSelection">
            Continue
          </VBtn>
        </template>
      </VCard>
    </VDialog>
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
.scanned-events {
  max-width: 120px;
}

/* disable only interactive elements */
.readonly .v-btn,
.readonly .filter-entity {
  pointer-events: none;
}
.disabled-filter {
  opacity: 0.5;
  pointer-events: none;
}
</style>
<style>
.flex-column.d-flex > .filter-entity {
  max-width: 100%;
  width: 100%;
}
</style>
