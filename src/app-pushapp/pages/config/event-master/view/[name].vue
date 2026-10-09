<script setup>
import { useEventMasterStore } from "@app-pushapp/views/config/event-master/useEventMasterStore";
import {
  apiError,
  DATA_TYPES,
  DEFAULT_DATA_TYPE,
  dataTypeTitle,
  EVENT_KEY_TOOLTIP,
  formatDate,
  KEY_LABEL,
  lastUpdated,
} from "@app-pushapp/views/config/event-master/eventMaster";
import EventKeyChip from "@app-pushapp/views/config/event-master/EventKeyChip.vue";
import HideEventDialog from "@app-pushapp/views/config/event-master/HideEventDialog.vue";

// Event page. All editing is inline: row pencils edit one value; Edit Event makes everything editable and turns into Save.
const route = useRoute();
const store = useEventMasterStore();
const { show } = inject("snackbar");

const eventName = computed(() => route.params.name);
const event = ref(null);
const loading = ref(true);
const notFound = ref(false);
const activity = ref(null); // { events, users } for the last 7 days

const load = async () => {
  loading.value = true;
  notFound.value = false;
  cancelAll();
  try {
    event.value = await store.get(eventName.value);
    notFound.value = !event.value;
  } catch (e) {
    show({ message: apiError(e, "Unable to load event"), color: "error" });
  } finally {
    loading.value = false;
  }
  store.last7Days(eventName.value).then((a) => (activity.value = a)).catch(() => (activity.value = null));
};

const activityText = computed(() => {
  if (!activity.value) return "";
  const { events, users } = activity.value;
  if (!events && !users) return "No activity in the last 7 days";
  return `Last 7 days: ${events.toLocaleString("en-IN")} events · ${users.toLocaleString("en-IN")} users`;
});

// ---- Inline edit: event fields (null = not editing) ----
const draft = reactive({ displayLabel: null, description: null });
const labelError = ref("");
const savingField = ref(null);

const startEdit = (...fields) => {
  for (const f of fields) draft[f] = event.value[f] || "";
  labelError.value = "";
};
const cancelEdit = (field) => {
  draft[field] = null;
  if (field === "displayLabel") labelError.value = "";
};
const saveField = async (field) => {
  savingField.value = field;
  try {
    event.value = await store.update(eventName.value, { [field]: draft[field] });
    draft[field] = null;
    show({ message: "Event updated", color: "success" });
  } catch (e) {
    // 409 = label used by another event; keep the field open with the message under it.
    if (field === "displayLabel" && e?.response?.status === 409) labelError.value = apiError(e);
    else show({ message: apiError(e, "Unable to update event"), color: "error" });
  } finally {
    savingField.value = null;
  }
};

// ---- Inline edit: one property row at a time ----
const propDraft = ref(null); // { key, label, dataType, required }
const savingProp = ref(false);
const startPropEdit = (p) => {
  propDraft.value = { key: p.key, label: p.label || p.key, dataType: p.dataType || DEFAULT_DATA_TYPE, required: Boolean(p.required) };
};
const savePropEdit = async () => {
  savingProp.value = true;
  try {
    const { key, ...body } = propDraft.value;
    event.value = await store.updateProperty(eventName.value, key, body);
    propDraft.value = null;
    show({ message: "Property updated", color: "success" });
  } catch (e) {
    show({ message: apiError(e, "Unable to update property"), color: "error" });
  } finally {
    savingProp.value = false;
  }
};
// ---- Page edit mode: Edit Event makes everything editable, the button becomes Save ----
const editMode = ref(false);
const propDrafts = reactive({}); // key -> { label, dataType, required }, only while in edit mode
const savingAll = ref(false);
const toDraft = (p) => ({ label: p.label || p.key, dataType: p.dataType || DEFAULT_DATA_TYPE, required: Boolean(p.required) });

const enterEditMode = () => {
  propDraft.value = null;
  startEdit("displayLabel", "description");
  for (const p of event.value.propertyList || []) propDrafts[p.key] = toDraft(p);
  editMode.value = true;
};

const saveAll = async () => {
  savingAll.value = true;
  try {
    // Event fields first: a duplicate label (409) stops here and keeps edit mode open with the error.
    const body = {};
    for (const f of ["displayLabel", "description"]) if ((draft[f] || "") !== (event.value[f] || "")) body[f] = draft[f];
    if (Object.keys(body).length) {
      try {
        event.value = await store.update(eventName.value, body);
      } catch (e) {
        if (e?.response?.status === 409) return (labelError.value = apiError(e));
        throw e;
      }
    }
    // Then only the property rows that changed. A failure leaves drafts in place so Save can be retried.
    const changed = (event.value.propertyList || []).filter((p) => {
      const d = propDrafts[p.key];
      const o = toDraft(p);
      return d && (d.label !== o.label || d.dataType !== o.dataType || d.required !== o.required);
    });
    for (const p of changed) event.value = await store.updateProperty(eventName.value, p.key, { ...propDrafts[p.key] });
    cancelAll();
    show({ message: "Event saved", color: "success" });
  } catch (e) {
    show({ message: apiError(e, "Unable to save changes"), color: "error" });
  } finally {
    savingAll.value = false;
  }
};

const isEditingProp = (p) => editMode.value || propDraft.value?.key === p.key;
const rowDraft = (p) => (editMode.value ? propDrafts[p.key] : propDraft.value);

function cancelAll() {
  editMode.value = false;
  for (const k of Object.keys(propDrafts)) delete propDrafts[k];
  draft.displayLabel = null;
  draft.description = null;
  propDraft.value = null;
  labelError.value = "";
}

watch(eventName, load, { immediate: true });

// ---- Property search ----
const propSearch = ref("");
const filteredProps = computed(() => {
  const q = propSearch.value.trim().toLowerCase();
  const list = event.value?.propertyList || [];
  return q ? list.filter((p) => (p.label || "").toLowerCase().includes(q) || p.key.toLowerCase().includes(q)) : list;
});

// ---- Hide / unhide (stays on this page) ----
const hideOpen = ref(false);
const hiding = ref(false);
const setHidden = async (hidden) => {
  hiding.value = true;
  try {
    event.value = await store.update(eventName.value, { hidden });
    hideOpen.value = false;
    show({ message: hidden ? "Event hidden" : "Event visible again", color: "success" });
  } catch (e) {
    show({ message: apiError(e, "Unable to update event"), color: "error" });
  } finally {
    hiding.value = false;
  }
};

const propertyHeaders = [
  { title: "Property", key: "label" },
  { title: KEY_LABEL, key: "key" },
  { title: "Data Type", key: "dataType" },
  { title: "Required", key: "required" },
  { title: "Last Updated", key: "updatedAt", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];
const managedHeaders = [
  { title: KEY_LABEL, key: "key" },
  { title: "Data Type", key: "dataType" },
  { title: "", key: "lock", sortable: false, align: "end" },
];
</script>

<template>
  <div>
    <RouterLink :to="{ path: '/config/event-master/list' }" class="d-inline-flex align-center gap-1 text-body-2 mb-4">
      <VIcon icon="tabler-arrow-left" size="16" /> Back to Event Master
    </RouterLink>

    <div v-if="loading" class="d-flex justify-center pa-12"><VProgressCircular indeterminate color="primary" /></div>

    <VCard v-else-if="notFound" class="text-center pa-10">
      <div class="text-h6 mb-2">Event not found</div>
      <div class="text-body-2 mb-4">No event with the key "{{ eventName }}" exists in this workspace.</div>
      <VBtn variant="tonal" :to="{ path: '/config/event-master/list' }">Back to Event Master</VBtn>
    </VCard>

    <template v-else-if="event">
      <!-- Header -->
      <div class="d-flex align-start justify-space-between flex-wrap gap-4 mb-6">
        <div>
          <div class="d-flex align-center flex-wrap gap-3 mb-1">
            <h4 class="text-h4">{{ event.displayLabel }}</h4>
            <EventKeyChip :event-key="event.eventName" />
            <VChip v-if="event.managedObjectType" size="small" color="info" label>Managed · {{ event.managedObjectType }}</VChip>
            <!-- ponytail: "Managed_…" events sent without ops have no managedObjectType; tag by name until they send ops -->
            <VChip v-else-if="/^managed_/i.test(event.eventName)" size="small" color="info" label>Managed</VChip>            <VChip v-if="event.hidden" size="small" label prepend-icon="tabler-eye-off">Hidden</VChip>
          </div>
          <div v-if="activityText" class="text-body-2 d-flex align-center gap-1">
            <VIcon icon="tabler-activity" size="16" /> {{ activityText }}
          </div>
          <!-- Opens Event Analytics with this event selected (default last-7-days range) -->
          <RouterLink
            :to="{ path: '/dashboards/events', query: { event: event.eventName } }"
            class="text-body-2 text-primary d-inline-flex align-center gap-1 mt-1"
          >
            View in Event Analytics <VIcon icon="tabler-arrow-right" size="16" />
          </RouterLink>
        </div>
        <div class="d-flex gap-3">
          <template v-if="editMode">
            <VBtn variant="outlined" color="secondary" :disabled="savingAll" @click="cancelAll">Cancel</VBtn>
            <VBtn color="primary" prepend-icon="tabler-device-floppy" :loading="savingAll" @click="saveAll">Save</VBtn>
          </template>
          <template v-else>
            <VBtn v-if="event.hidden" variant="outlined" color="primary" prepend-icon="tabler-eye" :loading="hiding" @click="setHidden(false)">
              Unhide
            </VBtn>
            <VBtn v-else variant="outlined" color="primary" prepend-icon="tabler-eye-off" @click="hideOpen = true">Hide</VBtn>
            <VBtn color="primary" prepend-icon="tabler-pencil" @click="enterEditMode">Edit Event</VBtn>
          </template>
        </div>
      </div>

      <!-- Event Details -->
      <AppCardActions action-collapsed title="Event Details" class="mb-6 em-card">
        <VTable class="event-details">
          <thead>
            <tr>
              <th style="inline-size: 220px">Label</th>
              <th>Value</th>
              <th class="text-end" style="inline-size: 120px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Display Label -->
            <tr>
              <td class="text-medium-emphasis">Display Label</td>
              <td class="py-3">
                <AppTextField
                  v-if="draft.displayLabel !== null"
                  v-model="draft.displayLabel"
                  placeholder="Leave blank to show the internal key"
                  density="compact"
                  autofocus
                  :error-messages="labelError"
                  @update:model-value="labelError = ''"
                  @keyup.enter="editMode ? saveAll() : saveField('displayLabel')"
                  @keyup.esc="editMode ? cancelAll() : cancelEdit('displayLabel')"
                />
                <span v-else class="font-weight-medium text-high-emphasis">{{ event.displayLabel }}</span>
              </td>
              <td class="text-end text-no-wrap">
                <template v-if="editMode" />
                <template v-else-if="draft.displayLabel !== null">
                  <IconBtn color="success" :loading="savingField === 'displayLabel'" @click="saveField('displayLabel')"><VIcon icon="tabler-check" /></IconBtn>
                  <IconBtn @click="cancelEdit('displayLabel')"><VIcon icon="tabler-x" /></IconBtn>
                </template>
                <IconBtn v-else color="primary" @click="startEdit('displayLabel')"><VIcon icon="tabler-pencil" /></IconBtn>
              </td>
            </tr>

            <!-- Internal Key -->
            <tr>
              <td class="text-medium-emphasis">{{ KEY_LABEL }}</td>
              <td>
                <span class="d-inline-flex align-center flex-wrap gap-2">
                  <EventKeyChip :event-key="event.eventName" />
                  <span class="text-caption text-disabled d-inline-flex align-center gap-1">
                    <VIcon icon="tabler-lock" size="14" /> {{ EVENT_KEY_TOOLTIP }}
                  </span>
                </span>
              </td>
              <td class="text-end"><VIcon icon="tabler-lock" size="18" class="text-disabled me-2" /></td>
            </tr>

            <!-- Description -->
            <tr>
              <td class="text-medium-emphasis">Description</td>
              <td class="py-3">
                <AppTextarea
                  v-if="draft.description !== null"
                  v-model="draft.description"
                  placeholder="When does this event fire?"
                  rows="2"
                  auto-grow
                  density="compact"
                  @keyup.esc="editMode ? cancelAll() : cancelEdit('description')"
                />
                <span v-else class="text-wrap">{{ event.description || "—" }}</span>
              </td>
              <td class="text-end text-no-wrap">
                <template v-if="editMode" />
                <template v-else-if="draft.description !== null">
                  <IconBtn color="success" :loading="savingField === 'description'" @click="saveField('description')"><VIcon icon="tabler-check" /></IconBtn>
                  <IconBtn @click="cancelEdit('description')"><VIcon icon="tabler-x" /></IconBtn>
                </template>
                <IconBtn v-else color="primary" @click="startEdit('description')"><VIcon icon="tabler-pencil" /></IconBtn>
              </td>
            </tr>

            <!-- Last Updated -->
            <tr>
              <td class="text-medium-emphasis">Last Updated</td>
              <td>
                <span class="font-weight-medium text-high-emphasis">{{ lastUpdated(event).who }}</span>
                · {{ lastUpdated(event).when }}
              </td>
              <td class="text-end text-disabled"><span class="me-3">—</span></td>
            </tr>
          </tbody>
        </VTable>
      </AppCardActions>

      <!-- Event Properties -->
      <AppCardActions action-collapsed class="mb-6 em-card">
        <template #title>
          Event Properties
          <div class="text-body-2 text-medium-emphasis mt-1">
            Properties and data types defined for this event.
          </div>
        </template>
        <template #before-actions>
          <AppTextField
            v-model="propSearch"
            placeholder="Search event properties..."
            prepend-inner-icon="tabler-search"
            density="compact"
            clearable
            class="d-inline-block me-2"
            style="inline-size: 280px"
            @click:clear="propSearch = ''"
          />
        </template>

        <MyDataTable :headers="propertyHeaders" :items="filteredProps" :items-per-page="25">
          <template #item.label="{ item }">
            <AppTextField v-if="isEditingProp(item.raw)" v-model="rowDraft(item.raw).label" density="compact" :autofocus="!editMode" style="inline-size: 140px" />
            <span v-else class="font-weight-medium text-high-emphasis">{{ item.raw.label }}</span>
          </template>
          <template #item.key="{ item }">
            <EventKeyChip :event-key="item.raw.key" />
          </template>
          <template #item.dataType="{ item }">
            <AppSelect
              v-if="isEditingProp(item.raw)"
              v-model="rowDraft(item.raw).dataType"
              :items="DATA_TYPES"
              density="compact"
              placeholder="Type"
              style="inline-size: 120px"
            />
            <VChip v-else size="small" color="primary" variant="tonal">{{ dataTypeTitle(item.raw.dataType) }}</VChip>
          </template>
          <template #item.required="{ item }">
            <MyBooleanPicker v-if="isEditingProp(item.raw)" v-model="rowDraft(item.raw).required" style="inline-size: 136px" />
            <span v-else class="d-inline-flex align-center gap-1" :class="item.raw.required ? 'text-success' : 'text-disabled'">
              <VIcon icon="tabler-point-filled" size="14" /> {{ item.raw.required ? "Yes" : "No" }}
            </span>
          </template>
          <template #item.updatedAt="{ item }">
            <span v-if="item.raw.updatedAt" class="text-body-2">
              <span class="font-weight-medium text-high-emphasis">{{ lastUpdated(item.raw).who }}</span>
              · {{ formatDate(item.raw.updatedAt) }}
            </span>
            <span v-else class="text-disabled">—</span>
          </template>
          <template #item.actions="{ item }">
            <div class="d-flex justify-end text-no-wrap">
              <template v-if="editMode" />
              <template v-else-if="isEditingProp(item.raw)">
                <IconBtn color="success" :loading="savingProp" @click="savePropEdit"><VIcon icon="tabler-check" /></IconBtn>
                <IconBtn @click="propDraft = null"><VIcon icon="tabler-x" /></IconBtn>
              </template>
              <IconBtn v-else color="primary" :disabled="!!propDraft" @click="startPropEdit(item.raw)">
                <VIcon icon="tabler-pencil" />
                <VTooltip activator="parent" location="top">Edit property</VTooltip>
              </IconBtn>
            </div>
          </template>
          <template #no-data>
            <div class="pa-8 text-center text-body-2">
              <template v-if="propSearch">No properties match "{{ propSearch }}"</template>
              <template v-else-if="event.managedObjectType">
                This event has no custom properties. All its data is managed by PushApp (see Managed Properties below).
              </template>
              <template v-else>No properties yet. They appear once the SDK sends data with this event.</template>
            </div>
          </template>
        </MyDataTable>
      </AppCardActions>

      <!-- Managed Properties (read-only) -->
      <AppCardActions v-if="event.managedObjectType" action-collapsed class="em-card">
        <template #title>
          Managed Properties
          <div class="text-body-2 text-medium-emphasis mt-1">Defined by PushApp for {{ event.managedObjectType }} events. Read-only.</div>
        </template>
        <MyDataTable :headers="managedHeaders" :items="event.managedPropertyList || []" :items-per-page="25">
          <template #item.key="{ item }">
            <EventKeyChip :event-key="item.raw.key" />
          </template>
          <template #item.dataType="{ item }">
            <VChip size="small" color="primary" variant="tonal">{{ dataTypeTitle(item.raw.dataType) }}</VChip>
          </template>
          <template #item.lock>
            <VIcon icon="tabler-lock" size="18" class="text-disabled" />
            <VTooltip activator="parent" location="top">Managed by PushApp</VTooltip>
          </template>
        </MyDataTable>
      </AppCardActions>

      <HideEventDialog v-model="hideOpen" :event="event" :loading="hiding" @confirm="setHidden(true)" />
    </template>
  </div>
</template>

<style scoped>
.event-details td {
  vertical-align: middle;
}
</style>
<style scoped>
/* Card titles line up with the first table column (cells use 16px, card header defaults to 24px) */
:deep(.em-card .v-card-item) {
  padding-inline-start: 16px;
}
</style>
