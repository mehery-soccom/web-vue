<script setup>
import { useEventMasterStore } from "@app-pushapp/views/config/event-master/useEventMasterStore";
import { apiError, dotColor, lastUpdated } from "@app-pushapp/views/config/event-master/eventMaster";
import EventKeyChip from "@app-pushapp/views/config/event-master/EventKeyChip.vue";
import HideEventDialog from "@app-pushapp/views/config/event-master/HideEventDialog.vue";

const store = useEventMasterStore();
const router = useRouter();
const { show } = inject("snackbar");

const events = ref([]);
const loading = ref(false);
const loadError = ref(false);
const search = ref("");
const showHidden = ref(false);

const headers = [
  { title: "Display Label", key: "displayLabel" },
  { title: "Internal Key", key: "eventName" },
  { title: "Properties", key: "properties", sortable: false },
  { title: "Last Updated", key: "updatedAt", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

// ponytail: whole list in the browser (search, paging, hidden filter); fine for a few hundred events per tenant.
// Past a few thousand, switch to the paged API (`page`, `limit`, `q`) plus a `hidden` query param.
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return events.value.filter(
    (e) =>
      (showHidden.value || !e.hidden) &&
      (!q || e.displayLabel.toLowerCase().includes(q) || e.eventName.toLowerCase().includes(q)),
  );
});
const hiddenCount = computed(() => events.value.filter((e) => e.hidden).length);

const load = async () => {
  loading.value = true;
  loadError.value = false;
  try {
    events.value = await store.listAll();
  } catch (e) {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const replace = (data) => {
  const i = events.value.findIndex((e) => e.eventName === data.eventName);
  if (i >= 0) events.value[i] = { ...events.value[i], ...data };
};

const openDetail = (eventName) =>
  router.push({ path: `/config/event-master/view/${encodeURIComponent(eventName)}` });
const onRowClick = (_e, row) => openDetail((row.item?.raw || row.item).eventName);

// Hide / unhide
const hideTarget = ref(null);
const hideOpen = ref(false);
const hiding = ref(false);
const undo = reactive({ open: false, event: null });

const setHidden = async (item, hidden) => {
  const data = await store.update(item.eventName, { hidden });
  replace(data);
  return data;
};

const askHide = (item) => {
  hideTarget.value = item;
  hideOpen.value = true;
};

const confirmHide = async () => {
  hiding.value = true;
  try {
    const data = await setHidden(hideTarget.value, true);
    hideOpen.value = false;
    // With "Show hidden" off the row leaves the list, so offer Undo.
    if (!showHidden.value) Object.assign(undo, { open: true, event: data });
    else show({ message: "Event hidden", color: "success" });
  } catch (e) {
    show({ message: apiError(e, "Unable to hide event"), color: "error" });
  } finally {
    hiding.value = false;
  }
};

const unhide = async (item) => {
  try {
    await setHidden(item, false);
    undo.open = false;
    show({ message: "Event visible again", color: "success" });
  } catch (e) {
    show({ message: apiError(e, "Unable to unhide event"), color: "error" });
  }
};
</script>

<template>
  <div>
    <div class="d-flex align-start justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">Event Master</h4>
        <p class="text-body-1 mb-0">Manage display labels, descriptions, and metadata for app events.</p>
      </div>
      <div class="d-flex align-center flex-wrap gap-4">
        <VSwitch v-model="showHidden" :label="`Show hidden (${hiddenCount})`" hide-details density="compact" />
        <AppTextField
          v-model="search"
          placeholder="Search label or internal key"
          prepend-inner-icon="tabler-search"
          clearable
          style="min-inline-size: 280px"
          @click:clear="search = ''"
        />
      </div>
    </div>

    <AppCardActions action-collapsed class="em-card">
      <template #title>
        <span class="d-inline-flex align-center gap-2">
          Events
          <VChip size="small" color="primary" label>{{ filtered.length }}</VChip>
        </span>
      </template>

      <div v-if="loadError" class="d-flex flex-column align-center pa-10 gap-3">
        <span class="text-body-1">Couldn't load events.</span>
        <VBtn variant="tonal" prepend-icon="tabler-refresh" @click="load">Retry</VBtn>
      </div>

      <MyDataTable
        v-else
        :headers="headers"
        :items="filtered"
        :loading="loading"
        :items-per-page="10"
        class="event-master-table"
        @click:row="onRowClick"
      >
        <template #item.displayLabel="{ item }">
          <div class="d-flex align-center gap-2" :class="{ 'is-hidden': item.raw.hidden }">
            <span class="dot" :style="{ background: dotColor(item.raw.eventName) }" />
            <span class="font-weight-medium text-high-emphasis">
              {{ item.raw.displayLabel }}
              <VTooltip v-if="item.raw.description" activator="parent" location="top" max-width="360">
                {{ item.raw.description }}
              </VTooltip>
            </span>
            <VChip v-if="item.raw.hidden" size="x-small" label>Hidden</VChip>
          </div>
        </template>

        <template #item.eventName="{ item }">
          <EventKeyChip :class="{ 'is-hidden': item.raw.hidden }" :event-key="item.raw.eventName" />
        </template>

        <template #item.properties="{ item }">
          <VChip size="small" label :class="{ 'is-hidden': item.raw.hidden }">
            {{ (item.raw.dataProperties || []).length }} properties
          </VChip>
        </template>

        <template #item.updatedAt="{ item }">
          <span class="text-body-2" :class="{ 'is-hidden': item.raw.hidden }">
            <span class="font-weight-medium text-high-emphasis">{{ lastUpdated(item.raw).who }}</span>
            · {{ lastUpdated(item.raw).when }}
          </span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end" @click.stop>
            <IconBtn v-if="item.raw.hidden" @click="unhide(item.raw)">
              <VIcon icon="tabler-eye-off" />
              <VTooltip activator="parent" location="top">Unhide</VTooltip>
            </IconBtn>
            <IconBtn v-else @click="askHide(item.raw)">
              <VIcon icon="tabler-eye" />
              <VTooltip activator="parent" location="top">Hide</VTooltip>
            </IconBtn>
            <IconBtn color="primary" @click="openDetail(item.raw.eventName)">
              <VIcon icon="tabler-pencil" />
              <VTooltip activator="parent" location="top">Edit event</VTooltip>
            </IconBtn>
          </div>
        </template>

        <template #no-data>
          <div class="d-flex flex-column align-center justify-center pa-8" style="min-height: 200px">
            <VProgressCircular v-if="loading" indeterminate color="primary" />
            <template v-else-if="search">No events match "{{ search }}"</template>
            <template v-else-if="events.length">All events are hidden. Turn on "Show hidden" to see them.</template>
            <template v-else>No events yet. Events appear here once the SDK sends them.</template>
          </div>
        </template>
      </MyDataTable>
    </AppCardActions>

    <HideEventDialog v-model="hideOpen" :event="hideTarget" :loading="hiding" @confirm="confirmHide" />

    <VSnackbar v-model="undo.open" location="top" :timeout="6000">
      "{{ undo.event?.displayLabel }}" hidden
      <template #actions>
        <VBtn variant="text" color="primary" @click="unhide(undo.event)">Undo</VBtn>
      </template>
    </VSnackbar>
  </div>
</template>

<style lang="scss" scoped>
.dot {
  display: inline-block;
  flex-shrink: 0;
  block-size: 8px;
  border-radius: 50%;
  inline-size: 8px;
}

.is-hidden {
  opacity: 0.5;
}

.event-master-table :deep(tbody tr) {
  cursor: pointer;
}
</style>
<style scoped>
/* Card title lines up with the first table column (cells use 16px, card header defaults to 24px) */
:deep(.em-card .v-card-item) {
  padding-inline-start: 16px;
}
</style>
