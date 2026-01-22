<template>
  <VCard flat class="pa-4 ab-metrics">
    <!-- Campaign stats -->
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
    <div style="margin-left: 40px;font-weight: 800;" v-else-if="!filteredCta.length && !abTesting.enabled"> No CTA available</div>

    <!-- CTA By Hour Table -->
    <!-- <VRow v-if="ctaByHourEntries.length" class="mt-3">
      <VCol cols="12">
        <h4 class="mb-2">CTA by Hour</h4>
        <MyDataTable
          :headers="ctaHeaders"
          :items="ctaByHourEntries"
          :items-per-page="ctaByHourEntries.length"
          :page="1"
          density="compact"
          class="elevation-1"
        >
          <template #item.timestamp="{ item }">
            {{ formatDate(item.raw.timestamp) }}
          </template>
          <template #bottom></template>
        </MyDataTable>
      </VCol>
    </VRow> -->

    <!-- A/B Testing Enabled -->
    <template v-if="abTesting?.enabled">
      <h4 class="mt-3 mb-3">A/B Testing Stats</h4>

      <!-- GLOBAL FLOW -->
      <template v-if="!abTesting.distributionParameter">
        <!-- Info -->
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
            {{ abTesting.evaluationWindow }} Minute(s)
          </VCol>
        </VRow>

        <!-- Decision Info -->
        <VRow class="mt-3">
          <VCol cols="12">
            <VAlert
              :type="
                {
                  CREATED: 'info',
                  TESTING: 'info',
                  AWAITING_RESULT: 'info',
                  CONCLUDED: 'success',
                  ABORTED: 'error',
                }[abTesting.state]
              "
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
            <!-- <h4 class="mb-2">Variant Metrics</h4> -->
            <MyDataTable
              :headers="metricHeaders"
              :items="metricRows"
              density="compact"
              class="elevation-1"
            >
              <template #item.variant="{ item }">
                <strong :class="winnerHighlight(item.raw.variant)">{{
                  item.raw.variant
                }}</strong>
              </template>

              <template #item.cta_percent="{ item }">
                <div
                  v-if="item.raw.conversionValue"
                  class="d-flex align-center"
                >
                  <span class="me-2">{{ item.raw.cta_percent }}</span>
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

      <!-- PARAMETER DISTRIBUTION FLOW -->
      <template v-else>
        <!-- Info -->
        <VRow class="mb-3">
          <VCol cols="12" md="4">
            <strong>Sample Size:</strong> {{ abTesting.sampleSize }} %
          </VCol>
          <VCol cols="12" md="4">
            <strong>Evaluation Window:</strong>
            {{ abTesting.evaluationWindow }} Minute(s)
          </VCol>
        </VRow>

        <!-- Parameter Table -->
        <!-- <h4 class="mb-2">Parameter Metrics</h4> -->
        <MyDataTable
          :headers="distributionHeaders"
          :items="distributionRows"
          show-expand
          item-value="param"
          class="elevation-1"
          density="compact"
        >
          <!-- Expansion Row -->
          <template #expanded-row="{ item }">
            <tr class="v-data-table__tr">
              <td :colspan="distributionHeaders.length">
                <!-- Decision Info -->
                <VAlert
                  :type="
                    {
                      CONCLUDED: 'success',
                      ABORTED: 'error',
                      AWAITING_RESULT: 'info',
                      TESTING: 'info',
                    }[abTesting.stateDistributionWise?.[item.raw.param]]
                  "
                  variant="outlined"
                  class="mb-3 mt-3 text-body-2"
                >
                  <strong>Decision:</strong>
                  {{
                    abTesting.decisionDistributionWise?.[item.raw.param]
                      ?.ruleApplied || "—"
                  }}
                  :
                  {{
                    abTesting.decisionDistributionWise?.[item.raw.param]
                      ?.reason || "—"
                  }}
                  <br />
                  <strong>Decided at:</strong>
                  {{
                    formatDate(
                      abTesting.decisionDistributionWise?.[item.raw.param]
                        ?.decidedAt
                    )
                  }}
                </VAlert>

                <!-- Metrics Table -->
                <MyDataTable
                  :headers="metricHeaders"
                  :items="metricRowsDistribution(item.raw.param)"
                  density="compact"
                  class="elevation-1"
                >
                  <template #item.variant="{ item: vItem }">
                    <strong
                      :class="
                        winnerHighlightDistribution(
                          item.raw.param,
                          vItem.raw.variant
                        )
                      "
                    >
                      {{ vItem.raw.variant }}
                    </strong>
                  </template>

                  <template #item.cta_percent="{ item: vItem }">
                    <div
                      v-if="vItem.raw.conversionValue"
                      class="d-flex align-center"
                    >
                      <span class="me-2">{{ vItem.raw.cta_percent }}</span>
                      <VProgressLinear
                        :model-value="vItem.raw.conversionValue"
                        height="6"
                        :color="
                          winnerHighlightDistribution(
                            item.raw.param,
                            vItem.raw.variant,
                            true
                          )
                        "
                        rounded
                        style="width: 80px"
                      />
                    </div>
                  </template>

                  <template #bottom></template>
                </MyDataTable>
              </td>
            </tr>
          </template>

          <!-- Optional cell formatting -->
          <template #item.param="{ item }">
            <strong :class="item.raw._isTotal ? '' : ''">
              {{ item.raw.param }}
            </strong>
          </template>
          <template #item.state="{ item }">
            <span v-if="!item.raw._isTotal" class="text-uppercase">{{
              abTesting.stateDistributionWise?.[item.raw.param] || "—"
            }}</span>
          </template>
          <template #item.winner="{ item }">
            <span
              v-if="!item.raw._isTotal"
              :class="winnerClassFor(item.raw.param)"
            >
              {{ abTesting.winnerDistributionWise?.[item.raw.param] || "—" }}
            </span>
          </template>

          <template #bottom></template>
        </MyDataTable>
      </template>
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
  { title: "Dismissed", key: "dismissed", align: "center" },
  { title: "Expired", key: "expired", align: "center" },
  // { title: "Resolved", key: "resolved", align: "center" }, // optional
  { title: "CTA", key: "cta", align: "center" },
  { title: "CTA %", key: "cta_percent", align: "start" },
];
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
      cta_percent: `${conversion}%`,
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
      cta_percent: "—",
      conversionValue: 0,
    });
  }

  return rows;
});

/* ---------- DISTRIBUTION HELPERS ---------- */
const metricRowsDistribution = (param) => {
  const metrics = props.abTesting?.metricsDistributionWise?.[param] || {};
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
      cta_percent: `${conversion}%`,
      conversionValue: parseFloat(conversion),
    };
  });

  if (metrics.totalSample || metrics.totalResolved) {
    rows.push({
      variant: "Total",
      sent: metrics.totalSample || 0,
      cta: (metrics.A?.cta ?? 0) + (metrics.B?.cta ?? 0),
      dismissed: (metrics.A?.dismissed ?? 0) + (metrics.B?.dismissed ?? 0),
      expired: (metrics.A?.expired ?? 0) + (metrics.B?.expired ?? 0),
      resolved: metrics.totalResolved || 0,
      cta_percent: "—",
      conversionValue: 0,
    });
  }

  return rows;
};
const winnerHighlightDistribution = (param, variant, colorOnly = false) => {
  const winner = props.abTesting?.winnerDistributionWise?.[param];
  if (variant === "Total") return colorOnly ? "grey" : "";
  return colorOnly
    ? winner === variant
      ? "success"
      : "grey"
    : winner === variant
    ? "text-success"
    : "";
};
const winnerClassFor = (param) =>
  props.abTesting?.winnerDistributionWise?.[param]
    ? "text-success font-weight-medium"
    : "text-grey";
const distributionHeaders = [
  { title: "", key: "data-table-expand" },
  { title: "Distribution", key: "param" },
  { title: "Audience", key: "targetAudience" },
  { title: "Sample", key: "sampleSize" },
  { title: "CTA", key: "totalCta" },
  { title: "CTA%", key: "totalCtaPct" },
  { title: "State", key: "state" },
  { title: "Winner", key: "winner" },
];
const distributionRows = computed(() => {
  const ab = props.abTesting;
  if (!ab?.metricsDistributionWise) return [];

  const rows = [];
  let totalAudience = 0;
  let totalSample = 0;
  let totalCta = 0;

  for (const [param, metrics] of Object.entries(ab.metricsDistributionWise)) {
    // sample size
    const sampleSize =
      ab.sampleSizeCountDistributionWise?.[param] || metrics.totalSample || 0;

    // total CTA = sum of all variants' CTA
    const totalCtaParam = Object.values(metrics)
      .filter((v) => typeof v === "object" && "cta" in v)
      .reduce((sum, v) => sum + (v.cta || 0), 0);

    // compute % (safe divide)
    const totalCtaPct =
      sampleSize > 0 ? ((totalCtaParam / sampleSize) * 100).toFixed(1) : "—";

    rows.push({
      param,
      targetAudience: ab.targetAudienceCountDistributionWise?.[param] ?? "—",
      sampleSize,
      totalCta: totalCtaParam,
      totalCtaPct,
      winner: ab.winnerDistributionWise?.[param] || "—",
      state: ab.stateDistributionWise?.[param] || "—",
    });

    totalAudience += ab.targetAudienceCountDistributionWise?.[param] || 0;
    totalSample += sampleSize;
    totalCta += totalCtaParam;
  }

  // append total summary row
  const totalRow = {
    param: "Total",
    targetAudience: totalAudience,
    sampleSize: totalSample,
    totalCta,
    totalCtaPct:
      totalSample > 0 ? ((totalCta / totalSample) * 100).toFixed(1) : "—",
    winner: "-",
    state: "-",
    _isTotal: true,
  };

  return [...rows, totalRow];
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

      tbody tr:last-child button {
        display: none !important;
      }
    }
  }
}
</style>
