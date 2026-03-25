<template>
  <VCard flat class="pa-4 campaign-metrics">
    <!-- CTA Table -->
    <VRow v-if="filteredCta.length">
      <VCol cols="12">
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
  </VCard>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  stats: Object,
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
    .map(([key, value]) => ({ id: key, count: value }));

  return r;
});
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
