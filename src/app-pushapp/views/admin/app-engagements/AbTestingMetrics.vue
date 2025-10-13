<template>
  <VCard flat class="pa-4 ab-metrics">
    <!-- A/B Testing Enabled -->
    <template v-if="abTesting?.enabled">
      <!-- Summary -->
      <VRow>
        <VCol cols="12" md="4">
          <strong>State:</strong> {{ abTesting.state || "—" }}
        </VCol>
        <VCol cols="12" md="4">
          <strong>Winner: </strong>
          <span :class="winnerClass">{{ abTesting.winner || "—" }}</span>
        </VCol>
        <VCol cols="12" md="4">
          <strong>Target Audience:</strong>
          {{ abTesting.targetAudienceCount }}
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="12" md="4">
          <strong>Sample Size:</strong> {{ abTesting.sampleSize }} %
        </VCol>
        <VCol cols="12" md="4">
          <strong>Sample Size Count:</strong> {{ abTesting.sampleSizeCount }}
        </VCol>
        <VCol cols="12" md="4">
          <strong>Evaluation Window:</strong>
          {{ abTesting.evaluationWindow }} Minutes
        </VCol>
      </VRow>

      <!-- <VRow class="mt-2">
        <VCol cols="12" md="6">
          <strong>Split:</strong> A - {{ abTesting.split?.A ?? 0 }}%, B -
          {{ abTesting.split?.B ?? 0 }}%
        </VCol>
        <VCol cols="12" md="6">
        <strong>Variant Strategy:</strong>
        {{ abTesting.variantAssignmentStrategy || "—" }}
      </VCol>
      </VRow> -->

      <!-- Decision Info -->
      <VRow class="mt-3">
        <VCol cols="12">
          <VAlert
            :type="abTesting.winner ? 'success' : 'info'"
            variant="outlined"
            class="text-body-2"
          >
            <strong>Decision: </strong>
            <span class="text-uppercase">{{
              abTesting.decision?.ruleApplied || "—"
            }}</span>
            :
            {{ abTesting.decision?.reason || "—" }}
            <br />
            <strong>Decided at:</strong>
            {{ formatDate(abTesting.decision?.decidedAt) }}
          </VAlert>
        </VCol>
      </VRow>

      <!-- Metrics Table -->
      <VRow class="mt-3">
        <VCol cols="12">
          <h4 class="mb-2">Variant Metrics</h4>
          <MyDataTable
            :headers="metricHeaders"
            :items="metricRows"
            density="compact"
            hide-default-footer
            class="elevation-1"
          >
            <template #item.variant="{ item }">
              <strong :class="winnerHighlight(item.raw.variant)">{{
                item.raw.variant
              }}</strong>
            </template>

            <template #item.conversionRate="{ item }">
              <div v-if="item.raw.conversionValue" class="d-flex align-center">
                <span class="me-2">{{ item.raw.conversionRate }}</span>
                <VProgressLinear
                  :model-value="item.raw.conversionValue"
                  height="6"
                  :color="winnerHighlight(item.raw.variant, true)"
                  rounded
                  style="width: 80px"
                />
              </div>
            </template>

            <template #bottom></template>
          </MyDataTable>
        </VCol>
      </VRow>
    </template>
    <!-- A/B Testing Disabled -->
    <template v-else>
      <!-- <VRow>
        <VCol cols="12" md="4">
          <strong>Total Audience:</strong> {{ stats.total ?? "—" }}
        </VCol>
        <VCol cols="12" md="4">
          <strong>Sent:</strong> {{ stats.sent ?? "—" }}
        </VCol>
        <VCol cols="12" md="4">
          <strong>Dismissed:</strong> {{ stats.dismissed ?? "—" }}
        </VCol>
      </VRow> -->

      <VRow v-if="filteredCta.length" class="mt-3">
        <VCol cols="12">
          <h4 class="mb-2">CTA Stats</h4>
          <MyDataTable
            :headers="filteredCtaHeaders"
            :items="filteredCta"
            :items-per-page="filteredCta.length"
            :page="1"
            density="compact"
            class="custom"
          >
            <template #bottom></template>
          </MyDataTable>
        </VCol>
      </VRow>

      <VRow v-if="ctaByHourEntries.length" class="mt-3">
        <VCol cols="12">
          <h4 class="mb-2">CTA by Hour</h4>
          <MyDataTable
            :headers="ctaHeaders"
            :items="ctaByHourEntries"
            :items-per-page="ctaByHourEntries.length"
            :page="1"
            density="compact"
          >
            <template #item.timestamp="{ item }">
              {{ formatDate(item.raw.timestamp) }}
            </template>
            <template #bottom></template>
          </MyDataTable>
        </VCol>
      </VRow>
    </template>
  </VCard>
</template>

<script setup>
import { computed } from "vue";
import { useDateFormat } from "@vueuse/core"; // optional, for date formatting

const props = defineProps({
  abTesting: {
    type: Object,
    required: true,
  },
  stats: Object,
});

/* ---------- TABLE HEADERS ---------- */
const metricHeaders = [
  { title: "Variant", key: "variant" },
  { title: "Sent", key: "sent", align: "center" },
  { title: "CTA", key: "cta", align: "center" },
  { title: "Dismissed", key: "dismissed", align: "center" },
  { title: "Expired", key: "expired", align: "center" },
  //   { title: "Resolved", key: "resolved", align: "center" },
  { title: "Conversion Rate", key: "conversionRate", align: "start" },
];

/* ---------- COMPUTED METRICS ---------- */
const metricRows = computed(() => {
  const metrics = props.abTesting?.metrics || {};
  const variants = ["A", "B"];
  const rows = variants.map((v) => {
    const m = metrics[v] || {};
    const sent = m.sent || 0;
    const cta = m.cta || 0;
    const conversion = sent > 0 ? ((cta / sent) * 100).toFixed(1) : "0.0";
    return {
      variant: v,
      sent,
      cta,
      dismissed: m.dismissed || 0,
      expired: m.expired || 0,
      resolved: m.resolved || 0,
      conversionRate: `${conversion}%`,
      conversionValue: parseFloat(conversion),
    };
  });

  // Add total row
  if (metrics.totalSample || metrics.totalResolved) {
    rows.push({
      variant: "Total",
      sent: metrics.totalSample || 0,
      cta: (metrics.A?.cta ?? 0) + (metrics.B?.cta ?? 0),
      dismissed: (metrics.A?.dismissed ?? 0) + (metrics.B?.dismissed ?? 0),
      expired: (metrics.A?.expired ?? 0) + (metrics.B?.expired ?? 0),
      resolved: metrics.totalResolved || 0,
      conversionRate: "—",
      conversionValue: 0,
    });
  }

  console.log("metricRows", rows);
  return rows;
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

/* ---------- CTA BY HOUR ---------- */
const ctaHeaders = [
  { title: "Timestamp", key: "timestamp" },
  { title: "Count", key: "count" },
];

const ctaByHourEntries = computed(() => {
  const obj = props.stats?.ctaByHour || {};
  return Object.entries(obj).map(([timestamp, count]) => ({
    timestamp,
    count,
  }));
});

/* ---------- HELPERS ---------- */
const winnerClass = computed(() =>
  props.abTesting.winner ? "text-success font-weight-medium" : "text-grey"
);

const winnerHighlight = (variant, colorOnly = false) => {
  const winner = props.abTesting?.winner;
  if (variant === "Total") return colorOnly ? "grey" : "";
  return colorOnly
    ? winner === variant
      ? "success"
      : "grey"
    : winner === variant
    ? "text-success"
    : "";
};

const formatDate = (d) =>
  d ? useDateFormat(d, "YYYY-MM-DD HH:mm:ss").value : "—";
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
.ab-metrics {
  .my-data-table {
    .v-table__wrapper {
      min-height: 100px !important;
    }
  }
}
</style>
