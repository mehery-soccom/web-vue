<script setup>
import { VDataTable, VDataTableServer } from "vuetify/labs/VDataTable";

const props = defineProps({
  serverSide: {
    type: Boolean,
    default: false,
  },

  headers: Array,
  items: Array,
  loading: Boolean,

  itemsLength: {
    type: Number,
  },

  page: {
    type: Number,
    default: 1,
  },
  itemsPerPage: {
    type: Number,
    default: 10,
  },
  itemsPerPageOptions: {
    type: Array,
    default: [
      { value: 10, title: "10" },
      { value: 25, title: "25" },
      { value: 50, title: "50" },
      { value: 100, title: "100" },
    ],
  },
  sortBy: {
    type: Array,
    default: () => [],
  },

  filters: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  // "update:filters",
  "update:options",
]);

/**
 * useAttrs() -  To forward unknown props and listeners
 * usage : v-bind="attrs"
 * Does Not Include :
 * 1. Props declared via defineProps() (you access those directly).
 * 2. Emits declared via defineEmits() (those are meant to be handled with emit()).
 */
const attrs = useAttrs();

/**
 * usage : v-bind="tableProps"
 */
const tableProps = computed(() => {
  const { filters, ...rest } = props;

  const _props = { ...rest, itemsLength: itemsLength.value };

  // console.log("_props", _props);
  return _props;
});

/**
 * usage : v-on="tableListeners"
 */
const tableListeners = computed(() => {
  const _listeners = Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key.startsWith("on")),
  );

  // console.log("_listeners", _listeners);
  return _listeners;
});

const slots = useSlots();

const hasSlot = (name) => Object.prototype.hasOwnProperty.call(slots, name);

const itemScopedSlots = computed(() => {
  let r = Object.entries(slots).filter(
    ([slotName, fn]) =>
      slotName.startsWith("item.") && typeof fn === "function",
  );
  return r;
});

const itemsLength = computed(() => {
  return props.serverSide ? props.itemsLength || 0 : props.items.length;
});

const handleOptionsUpdate = (options) => {
  // console.log("handleOptionsUpdate", options);

  emit("update:options", {
    itemsLength: itemsLength.value,

    page: options.page,
    itemsPerPage: options.itemsPerPage,
    sortBy: options.sortBy,

    filters: props.filters,
  });
};

const handleFiltersUpdate = () => {
  //   emit("update:filters", { ...props.filters });

  emit("update:options", {
    itemsLength: itemsLength.value,

    page: props.page,
    itemsPerPage: props.itemsPerPage,
    sortBy: props.sortBy,

    filters: props.filters,
  });
};

const currentComponent = computed(() => {
  return props.serverSide ? VDataTableServer : VDataTable;
});
</script>

<template>
  <component
    :is="currentComponent"
    class="text-no-wrap mb-3 my-data-table"
    v-bind="tableProps"
    v-on="tableListeners"
    @update:options="handleOptionsUpdate"
  >
    <!-- Filter inputs -->
    <template v-slot:thead>
      <tr>
        <td v-for="header in props.headers" :key="header.key" class="px-2">
          <VSelect
            v-if="
              props.filters.hasOwnProperty(header.key) &&
              header.filterType === 'select'
            "
            :items="header.filterOptions"
            v-model="props.filters[header.key]"
            density="compact"
            variant="underlined"
            @update:modelValue="handleFiltersUpdate"
            clearable
          ></VSelect>
          <VSwitch
            v-else-if="
              props.filters.hasOwnProperty(header.key) &&
              header.filterType === 'switch'
            "
            style="margin-left: 6px"
            v-model="props.filters[header.key]"
            @update:modelValue="handleFiltersUpdate"
          ></VSwitch>
          <v-text-field
            v-else-if="props.filters.hasOwnProperty(header.key)"
            v-model="props.filters[header.key]"
            density="compact"
            variant="underlined"
            @update:modelValue="handleFiltersUpdate"
            clearable
          />
        </td>
      </tr>
    </template>

    <!-- Forward default slot -->
    <template v-if="hasSlot('default')" #default="slotProps">
      <slot v-bind="slotProps" />
    </template>

    <!-- Forward item.* scoped slots -->
    <template
      v-for="[slotName, slotFn] in itemScopedSlots"
      :key="'item' + slotName"
      v-slot:[slotName]="slotProps"
    >
      <slot :name="slotName" v-bind="slotProps" />
    </template>

    <template
      v-if="!itemScopedSlots.length && hasSlot('item')"
      #item="slotProps"
    >
      <slot name="item" v-bind="slotProps" />
    </template>

    <!-- Forward no-data slot ( only if provided ) -->
    <template v-if="hasSlot('no-data')" #no-data="slotProps">
      <slot name="no-data" v-bind="slotProps" />
    </template>
    <template v-else #no-data>
      <div
        v-if="props.loading"
        class="d-flex flex-column align-center justify-center pa-6"
        style="min-height: 200px"
      >
        <v-progress-circular indeterminate color="primary" size="32" />
        <div class="mt-2">Loading data, please wait...</div>
      </div>
      <div
        v-else
        class="d-flex flex-column align-center justify-center pa-8"
        style="min-height: 300px"
      >
        <v-icon size="64" color="grey lighten-1">mdi-folder-open</v-icon>
        <div class="text-h6 mt-4 mb-2">No records found</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Looks like there's nothing here yet. Start by adding a new item.
        </div>
      </div>
    </template>

    <!-- Forward expanded-row slot ( only if provided ) -->
    <template v-if="hasSlot('expanded-row')" #expanded-row="slotProps">
      <slot name="expanded-row" v-bind="slotProps" />
    </template>

    <template v-if="hasSlot('bottom')" #bottom="slotProps">
      <slot name="bottom" v-bind="slotProps" />
    </template>
  </component>
</template>

<style lang="scss">
.my-data-table {
  .v-table__wrapper {
    min-height: 300px !important;
  }
  .v-selection-control__wrapper {
    width: 100% !important;
  }
}
</style>
