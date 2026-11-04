<template>
  <VCard flat class="pa-4 campaign-metrics">
    <!-- CTA Table -->
    <VRow v-if="filteredCta.length">
      <VCol cols="8">
        <h4 class="mb-2">CTA Stats</h4>
        <MyDataTable
          :headers="filteredCtaHeaders"
          :items="filteredCta"
          :items-per-page="filteredCta.length"
          :page="1"
          density="compact"
          class="elevation-1"
        >
          <template #bottom></template>
        </MyDataTable>
      </VCol>
    </VRow>
    <VRow v-else>
      <VCol cols="12">
        <h4>No CTA available</h4>
      </VCol>
    </VRow>

    <!-- CTA by Platform Table -->
    <VRow v-if="hasCtaByPlatform" class="mt-3">
      <VCol cols="8">
        <h4 class="mb-2">CTA by Platform</h4>
        <MyDataTable
          :headers="platformHeaders"
          :items="ctaByPlatformEntries"
          :items-per-page="ctaByPlatformEntries.length"
          :page="1"
          density="compact"
          class="elevation-1"
        >
          <template #bottom></template>
        </MyDataTable>
      </VCol>
    </VRow>

    <!-- Success event totals -->
    <VCol v-if="hasSuccessStats" cols="8" class="mt-3">
      <div class="d-flex align-center flex-wrap gap-2 mb-2">
        <h4 class="mb-0">Success:</h4>
        <span
          v-if="successLabel"
          class="text-body-1 font-weight-medium text-high-emphasis"
        >
          {{ successLabel }}
        </span>
      </div>

      <MyDataTable
        :headers="successHeaders"
        :items="successRows"
        :items-per-page="successRows.length"
        :page="1"
        density="compact"
        class="elevation-1"
      >
        <template #bottom></template>
      </MyDataTable>
    </VCol>

    <!-- Opened by Platform Table -->
    <VRow v-if="hasOpenedByPlatform" class="mt-3">
      <VCol cols="8">
        <h4 class="mb-2">Opened by Platform</h4>
        <MyDataTable
          :headers="platformHeaders"
          :items="openedByPlatformEntries"
          :items-per-page="openedByPlatformEntries.length"
          :page="1"
          density="compact"
          class="elevation-1"
        >
          <template #bottom></template>
        </MyDataTable>
      </VCol>
    </VRow>
  </VCard>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  stats: Object,
  success: { type: Object, default: null },
});

/* ---------- Filtered CTA ---------- */
const filteredCtaHeaders = [
  { title: "ID", key: "id" },
  { title: "Count", key: "count" },
];
const filteredCta = computed(() => {
  const cta = props.stats?.cta || {};
  // remove internal or undesired keys
  const r = Object.entries(cta)
    .filter(([key]) => key !== "__count")
    .map(([key, value]) => ({ id: key, count: Number.isFinite(value) ? value.toLocaleString("en-IN") : value }));

  return r;
});

const platformRows = (obj = {}) => [
  { platform: "Android", count: (obj.android ?? 0).toLocaleString("en-IN") },
  { platform: "iOS", count: (obj.ios ?? 0).toLocaleString("en-IN") },
  { platform: "Unknown", count: (obj.unknown ?? 0).toLocaleString("en-IN") },
];

const platformHeaders = [
  { title: "Platform", key: "platform" },
  { title: "Count", key: "count" },
];

/* ---------- CTA by Platform ---------- */
const hasCtaByPlatform = computed(
  () => props.stats?.ctaByPlatform != null,
);
const ctaByPlatformEntries = computed(() =>
  platformRows(props.stats?.ctaByPlatform),
);

/* ---------- Success event ---------- */
const successLabel = computed(() => {
  const event = props.success?.event;
  if (!event) return "";
  return props.success.eventProperty
    ? `${event} - ${props.success.eventProperty}`
    : event;
});
const successHeaders = [
  { title: "Metric", key: "metric" },
  { title: "Count", key: "count" },
];
const successRows = computed(() =>
  [
    { metric: "Events", value: props.stats?.success?.event },
    { metric: "Users", value: props.stats?.success?.user },
    { metric: "Value", value: props.stats?.success?.value },
  ]
    .filter((row) => typeof row.value === "number")
    .map((row) => ({ metric: row.metric, count: row.value.toLocaleString("en-IN") })),
);
const hasSuccessStats = computed(() => successRows.value.length > 0);

/* ---------- Opened by Platform ---------- */
const hasOpenedByPlatform = computed(
  () => props.stats?.openedByPlatform != null,
);
const openedByPlatformEntries = computed(() =>
  platformRows(props.stats?.openedByPlatform),
);
</script>

<style scoped>
.text-success {
  color: var(--v-theme-success);
}
.font-weight-medium {
  font-weight: 500;
}
</style>
<style>
.campaign-metrics {
  .my-data-table {
    .v-table__wrapper {
      min-height: 100px !important;

      tbody tr:last-child button {
        display: none !important;
      }
    }
  }
}
</style>
