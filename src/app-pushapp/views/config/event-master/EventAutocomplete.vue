<script setup>
// The one look for every event dropdown: bold Event Master label, internal key underneath, divider between options,
// check on the selected one, and a pinned "Manage event labels in Event Master" link at the bottom.
// items: [{ title: displayLabel, value: eventKey }]. Search matches the label or the key. Display only.
defineOptions({ name: "EventAutocomplete", inheritAttrs: false });

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  items: { type: Array, default: () => [] },
  appStyle: { type: Boolean, default: false }, // label above the field (inspector / filter forms) instead of floating
  manageLink: { type: Boolean, default: true }, // pinned "Manage event labels in Event Master" link at the bottom
  showKey: { type: Boolean, default: true }, // closed field shows "label (key)"; the key shrinks first and ends in …
});
const emit = defineEmits(["update:modelValue"]);

const attrs = useAttrs();
const restAttrs = computed(() => {
  const { class: _c, style: _s, label: _l, ...rest } = attrs;
  return rest;
});

const selected = computed(() => props.items.find((i) => i.value === props.modelValue));

const filter = (_value, query, item) => {
  const q = String(query || "").toLowerCase();
  return [item?.raw?.title, item?.raw?.value].some((s) => String(s ?? "").toLowerCase().includes(q));
};

// On focus Vuetify fills the search with the selected label; select it so typing starts a fresh search.
const selectText = (e) => setTimeout(() => e?.target?.select?.(), 0);

const menuProps = computed(() => ({
  contentClass: [
    "event-picker-menu",
    ...(props.appStyle ? ["app-inner-list", "app-autocomplete__content", "v-autocomplete__content"] : []),
  ],
}));
</script>

<template>
  <div class="event-autocomplete" :class="[attrs.class, { 'flex-grow-1': appStyle, 'event-autocomplete--selected': modelValue != null && modelValue !== '' }]" :style="attrs.style">
    <VLabel v-if="appStyle && attrs.label" class="mb-1 text-body-2 text-high-emphasis" :text="attrs.label" />
    <VAutocomplete
      v-bind="restAttrs"
      :model-value="modelValue"
      :items="items"
      :label="appStyle ? undefined : attrs.label"
      variant="outlined"
      :custom-filter="filter"
      :menu-props="menuProps"
      @update:model-value="emit('update:modelValue', $event)"
      @focus="selectText"
    >
      <!-- Closed field: the label keeps priority; the key shrinks first and ends in "…". Hover shows both. -->
      <template #selection>
        <span
          class="event-selection"
          :title="selected && selected.title !== selected.value ? `${selected.title} (${selected.value})` : undefined"
        >
          <span class="event-selection__label">{{ selected?.title ?? modelValue }}</span>
          <span
            v-if="showKey && selected && selected.title !== selected.value"
            class="event-selection__key text-disabled text-caption"
          >
            ({{ selected.value }})
          </span>
        </span>
      </template>

      <template #item="{ props: itemProps, item }">
        <VListItem v-bind="itemProps" :title="undefined" class="event-option">
          <VListItemTitle class="font-weight-bold">{{ item.raw.title }}</VListItemTitle>
          <VListItemSubtitle class="event-option__key">{{ item.raw.value }}</VListItemSubtitle>
          <template #append>
            <VIcon v-if="item.raw.value === modelValue" icon="tabler-check" color="primary" size="18" />
          </template>
        </VListItem>
      </template>

      <!-- Pinned to the bottom of the menu so it's visible without scrolling the whole event list -->
      <template v-if="manageLink" #append-item>
        <div class="event-master-cta">
          <VListItem :to="{ path: '/config/event-master/list' }" class="justify-center">
            <VListItemTitle class="text-primary text-center d-flex align-center justify-center gap-2">
              <VIcon icon="tabler-settings" size="18" /> Manage event labels in Event Master
            </VListItemTitle>
          </VListItem>
        </div>
      </template>
    </VAutocomplete>
  </div>
</template>

<style>
/* The menu is teleported, so these can't be scoped. */

/* Closed picker with a selection: the label/key gets the whole field. The (empty) search input only takes
   space again while the field is focused, i.e. while typing. With nothing selected the input stays (placeholder). */
.event-autocomplete .v-autocomplete__selection {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}
.event-autocomplete--selected .v-field:not(.v-field--focused) .v-field__input > input {
  flex: 0 0 0;
  min-width: 0;
  width: 0;
  padding: 0;
}
.event-selection {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.event-selection__label,
.event-selection__key {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-selection__label {
  flex: 0 1 auto;
}
.event-selection__key {
  flex: 0 100 auto; /* shrinks long before the label does */
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* Open menu */
.event-picker-menu .v-list {
  padding-block-end: 0 !important; /* so the pinned link sits flush with the menu's bottom edge */
}
.event-picker-menu .event-option {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); /* separator between options */
}
.event-picker-menu .event-option__key {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.event-picker-menu .event-master-cta {
  position: sticky;
  bottom: 0;
  z-index: 1;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
/* full-bleed row: the theme's list-item margin + radius would leave a gap around the hover */
.event-picker-menu .event-master-cta .v-list-item {
  margin: 0 !important;
  border-radius: 0 !important;
  min-block-size: 52px;
}
</style>
