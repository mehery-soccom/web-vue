<script setup>
import DataService from "@/@common/services/DataService";
import AppDateTimePicker from "@/app-pushapp/@core/components/app-form-elements/AppDateTimePicker.vue";
import { fmtNum } from "@app-pushapp/@core/utils/formatters";
import { hexToRgb } from "@app-pushapp/@layouts/utils";
import { useTheme } from "vuetify";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { SankeyChart, BarChart } from "echarts/charts";
import { TooltipComponent, GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

use([SankeyChart, BarChart, TooltipComponent, GridComponent, CanvasRenderer]);

const { show } = inject("snackbar");
const vuetifyTheme = useTheme();

const WINDOW_OPTIONS = [
  { title: "Yesterday", value: 1 },
  { title: "Last 7 days", value: 7 },
  { title: "Last 30 days", value: 30 },
  { title: "Last 60 days", value: 60 },
  { title: "Last 90 days", value: 90 },
];

const COHORT_COLORS = {
  champions: "#28C76F",
  engaged_champions: "#00BAD1",
  steady_core: "#7367F0",
  frequent_low_basket: "#FF9F43",
  promising_new_hv: "#4285F4",
  promising_new: "#82B1FF",
  engaged_non_buyers: "#A66BFF",
  high_value_at_risk: "#FF4C51",
  lapsing_regulars: "#F4B400",
  one_and_done: "#8D6E63",
  dormant: "#9E9E9E",
};
const FALLBACK_COLORS = Object.values(COHORT_COLORS);

const cohortColor = (id, index = 0) => COHORT_COLORS[id] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

const humanize = (id = "") =>
  String(id)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const isAborted = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const showError = (error, fallback) => {
  const apiErr = error.response?.data;
  show({ message: apiErr?.error?.message || apiErr?.message || fallback, color: "error" });
};

const textColor = computed(() => {
  const { colors, variables } = vuetifyTheme.current.value;
  return `rgba(${hexToRgb(colors["on-surface"])}, ${variables["medium-emphasis-opacity"]})`;
});

const formatDate = (date) => date.toLocaleDateString("en-GB").split("/").join("-");
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(23, 59, 59, 999);

// Cohort transitions (sankey)
const selectedWindow = ref(1);
const sankeyData = ref(null);
const isSankeyLoading = ref(false);
let sankeyAbort = null;

// Cohort distribution (bar)
const cohortDate = ref(formatDate(yesterday));
const cohortsData = ref(null);
const isCohortsLoading = ref(false);
let cohortsAbort = null;

const cohortNames = computed(() => {
  const names = {};
  (cohortsData.value?.cohorts || []).forEach((c) => {
    if (c?.id && c?.name) names[c.id] = c.name;
  });
  return names;
});

const cohortName = (id) => cohortNames.value[id] || humanize(id);

const formatPct = (value) => `${Number((Number(value) || 0).toFixed(1))}%`;

const migratedDayLabel = computed(() => `Migrated Status (Day ${selectedWindow.value})`);

const sankeySummary = computed(() => {
  const summary = sankeyData.value?.summary || {};
  return [
    { title: "Avg Retention", value: summary.avgRetention, color: "success" },
    { title: "Cumulative Churn", value: summary.cumulativeChurn, color: "error" },
    { title: "Reactivation", value: summary.reactivation, color: "info" },
  ];
});

const isMatrixExpanded = ref(false);

const transitionMatrix = computed(() => {
  const transitions = sankeyData.value?.transitions || [];
  const ids = [];
  const fromTotals = {};
  const toTotals = {};
  const users = {};
  transitions.forEach(({ from, to, users: count }) => {
    const value = Number(count) || 0;
    if (!ids.includes(from)) ids.push(from);
    if (!ids.includes(to)) ids.push(to);
    fromTotals[from] = (fromTotals[from] || 0) + value;
    toTotals[to] = (toTotals[to] || 0) + value;
    users[`${from}:${to}`] = (users[`${from}:${to}`] || 0) + value;
  });

  const columns = ids.filter((id) => toTotals[id]);
  const rows = ids
    .filter((id) => fromTotals[id])
    .map((id) => ({
      id,
      cells: columns.map((to) => {
        const count = users[`${id}:${to}`] || 0;
        return { to, count, pct: formatPct((count / fromTotals[id]) * 100) };
      }),
    }));

  return { columns, rows };
});

const sankeyOption = computed(() => {
  const data = sankeyData.value;
  const links = (data?.transitions || []).filter((t) => Number(t?.users) > 0);
  if (!links.length) return null;

  const totalUsers = Number(data.totalUsers) || 0;
  const fromTotals = {};
  const toTotals = {};
  const ids = [];
  links.forEach(({ from, to, users }) => {
    fromTotals[from] = (fromTotals[from] || 0) + Number(users);
    toTotals[to] = (toTotals[to] || 0) + Number(users);
    if (!ids.includes(from)) ids.push(from);
  });
  links.forEach(({ to }) => {
    if (!ids.includes(to)) ids.push(to);
  });

  const pctOf = (count) => formatPct(totalUsers ? (count / totalUsers) * 100 : 0);

  const buildNodes = (totals, side, depth, position) =>
    ids
      .filter((id) => totals[id])
      .map((id) => ({
        name: `${side}:${id}`,
        depth,
        itemStyle: { color: cohortColor(id, ids.indexOf(id)) },
        label: { position, formatter: `${cohortName(id)} (${pctOf(totals[id])})` },
      }));

  return {
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        if (params.dataType === "edge") {
          const from = cohortName(params.data.source.split(":")[1]);
          const to = cohortName(params.data.target.split(":")[1]);
          return `${from} → ${to}<br/><b>${fmtNum(params.data.value)}</b> users`;
        }
        return `${cohortName(params.name.split(":")[1])}<br/><b>${fmtNum(params.value)}</b> users`;
      },
    },
    series: [
      {
        type: "sankey",
        left: 180,
        right: 180,
        top: 10,
        bottom: 10,
        nodeWidth: 16,
        nodeGap: 10,
        layoutIterations: 0,
        draggable: false,
        emphasis: { focus: "adjacency" },
        label: { color: textColor.value, fontSize: 12 },
        lineStyle: { color: "source", opacity: 0.35, curveness: 0.5 },
        data: [
          ...buildNodes(fromTotals, "from", 0, "left"),
          ...buildNodes(toTotals, "to", 1, "right"),
        ],
        links: links.map(({ from, to, users }) => ({
          source: `from:${from}`,
          target: `to:${to}`,
          value: Number(users),
        })),
      },
    ],
  };
});

const cohortsOption = computed(() => {
  const cohorts = cohortsData.value?.cohorts || [];
  if (!cohorts.length) return null;

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: ([params]) => {
        const cohort = cohorts[params.dataIndex];
        return `${cohort.name}<br/><b>${fmtNum(cohort.count)}</b> users (${formatPct(cohort.pct)})`;
      },
    },
    grid: { left: 10, right: 110, top: 10, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: textColor.value, formatter: (value) => fmtNum(value) },
      splitLine: { lineStyle: { type: "dashed", opacity: 0.4 } },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: cohorts.map((c) => c.name || humanize(c.id)),
      axisLabel: { color: textColor.value },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 22,
        data: cohorts.map((c, index) => ({
          value: Number(c.count) || 0,
          itemStyle: { color: cohortColor(c.id, index), borderRadius: [0, 4, 4, 0] },
        })),
        label: {
          show: true,
          position: "right",
          color: textColor.value,
          formatter: ({ dataIndex }) => {
            const cohort = cohorts[dataIndex];
            return `${fmtNum(cohort.count)} (${formatPct(cohort.pct)})`;
          },
        },
      },
    ],
  };
});

const toApiDay = (value) => {
  const [day, month, year] = String(value).split("-");
  return `${year}${month}${day}`;
};

// Dummy data for local testing when the rfm sankey / cohorts APIs have no data
/*
const DUMMY_COHORT_IDS = [
  "champions", "engaged_champions", "steady_core", "frequent_low_basket", "promising_new_hv", "promising_new",
  "engaged_non_buyers", "high_value_at_risk", "lapsing_regulars", "one_and_done", "dormant",
];
const DUMMY_TRANSITION_MATRIX = [
  [280, 0, 40, 20, 0, 0, 0, 35, 15, 0, 10],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [25, 0, 230, 20, 0, 15, 0, 20, 15, 0, 25],
  [10, 0, 20, 110, 0, 0, 0, 0, 15, 0, 25],
  [15, 0, 10, 0, 40, 10, 0, 8, 0, 0, 7],
  [10, 0, 25, 0, 15, 120, 10, 0, 0, 15, 25],
  [0, 0, 0, 0, 10, 30, 150, 0, 0, 25, 45],
  [15, 0, 10, 10, 0, 0, 0, 60, 25, 0, 20],
  [10, 0, 15, 0, 0, 0, 0, 20, 90, 10, 55],
  [0, 0, 10, 0, 0, 30, 25, 0, 15, 140, 90],
  [0, 0, 30, 10, 0, 25, 20, 0, 15, 20, 330],
];
const DUMMY_SANKEY = {
  window: 30,
  totalUsers: 2600,
  transitions: DUMMY_TRANSITION_MATRIX.flatMap((row, i) =>
    row.map((users, j) => ({ from: DUMMY_COHORT_IDS[i], to: DUMMY_COHORT_IDS[j], users })),
  ),
  summary: { avgRetention: 75.7, cumulativeChurn: 24.3, reactivation: 26.7 },
};
const DUMMY_COHORTS = {
  day: 20261028,
  totalUsers: 2600,
  cohorts: [
    { id: "champions", name: "Champions", count: 400, pct: 15.4 },
    { id: "engaged_champions", name: "Engaged Champions", count: 0, pct: 0 },
    { id: "steady_core", name: "Steady Core", count: 350, pct: 13.5 },
    { id: "frequent_low_basket", name: "Frequent Low-Basket", count: 180, pct: 6.9 },
    { id: "promising_new_hv", name: "Promising New - HV", count: 90, pct: 3.5 },
    { id: "promising_new", name: "Promising New", count: 220, pct: 8.5 },
    { id: "engaged_non_buyers", name: "Engaged Non-Buyers", count: 260, pct: 10 },
    { id: "high_value_at_risk", name: "High-Value At Risk", count: 140, pct: 5.4 },
    { id: "lapsing_regulars", name: "Lapsing Regulars", count: 200, pct: 7.7 },
    { id: "one_and_done", name: "One-and-Done", count: 310, pct: 11.9 },
    { id: "dormant", name: "Dormant", count: 450, pct: 17.3 },
  ],
};
*/

const loadSankey = async () => {
  sankeyAbort?.abort();
  const controller = new AbortController();
  sankeyAbort = controller;
  isSankeyLoading.value = true;
  try {
    const res = await DataService.axios.get("/api/v1/analytics/rfm/sankey", {
      params: { window: selectedWindow.value },
      signal: controller.signal,
    });
    sankeyData.value = res?.data?.data || null;
    // sankeyData.value = { ...DUMMY_SANKEY, window: selectedWindow.value };
  } catch (error) {
    if (isAborted(error)) return;
    sankeyData.value = null;
    showError(error, "Failed to load cohort transitions");
  } finally {
    if (sankeyAbort === controller) isSankeyLoading.value = false;
  }
};

const loadCohorts = async () => {
  if (!cohortDate.value) return;
  cohortsAbort?.abort();
  const controller = new AbortController();
  cohortsAbort = controller;
  isCohortsLoading.value = true;
  try {
    const res = await DataService.axios.get("/api/v1/analytics/rfm/cohorts", {
      params: { day: toApiDay(cohortDate.value) },
      signal: controller.signal,
    });
    cohortsData.value = res?.data?.data || null;
    // cohortsData.value = { ...DUMMY_COHORTS, day: Number(toApiDay(cohortDate.value)) };
  } catch (error) {
    if (isAborted(error)) return;
    cohortsData.value = null;
    showError(error, "Failed to load cohorts");
  } finally {
    if (cohortsAbort === controller) isCohortsLoading.value = false;
  }
};

watch(selectedWindow, loadSankey);
watch(cohortDate, loadCohorts);

onMounted(() => {
  loadSankey();
  loadCohorts();
});

onBeforeUnmount(() => {
  sankeyAbort?.abort();
  cohortsAbort?.abort();
});
</script>

<template>
  <VRow>
    <VCol cols="12">
      <h3 class="text-h5">Cohort Dynamix</h3>
    </VCol>

    <VCol cols="12">
      <VCard :loading="isSankeyLoading">
        <VCardItem>
          <VCardTitle>Cohort Transitions</VCardTitle>
          <VCardSubtitle v-if="sankeyData?.totalUsers != null">
            {{ fmtNum(sankeyData.totalUsers) }} users
          </VCardSubtitle>
          <template #append>
            <VSelect
              v-model="selectedWindow"
              :items="WINDOW_OPTIONS"
              density="compact"
              variant="outlined"
              hide-details
              style="min-width: 170px;"
            />
          </template>
        </VCardItem>

        <VCardText>
          <template v-if="sankeyOption">
            <VChart class="cohort-sankey" :option="sankeyOption" autoresize />
            <div class="d-flex justify-space-between text-caption text-medium-emphasis px-2">
              <span>Baseline Status (Day 0)</span>
              <span>{{ migratedDayLabel }}</span>
            </div>
          </template>
          <div v-else class="cohort-empty text-medium-emphasis">
            {{ isSankeyLoading ? "Loading..." : "No transitions for this period" }}
          </div>
        </VCardText>

        <VDivider />

        <VCardText class="d-flex align-center">
          <VRow class="text-center flex-grow-1">
            <VCol v-for="item in sankeySummary" :key="item.title" cols="12" sm="4">
              <div class="text-body-1 text-medium-emphasis">{{ item.title }}</div>
              <div :class="['text-h5 font-weight-medium', `text-${item.color}`]">
                {{ item.value != null ? formatPct(item.value) : "—" }}
              </div>
            </VCol>
          </VRow>
          <VBtn
            icon
            variant="text"
            color="default"
            size="small"
            :disabled="!transitionMatrix.rows.length"
            @click="isMatrixExpanded = !isMatrixExpanded"
          >
            <VIcon :icon="isMatrixExpanded ? 'tabler-chevron-up' : 'tabler-chevron-down'" />
            <VTooltip activator="parent" location="top">
              {{ isMatrixExpanded ? "Hide" : "Show" }} transition matrix
            </VTooltip>
          </VBtn>
        </VCardText>

        <VExpandTransition>
          <div v-show="isMatrixExpanded && transitionMatrix.rows.length">
            <VDivider />
            <VCardText>
              <div class="text-body-1 text-medium-emphasis mb-3">Transition Matrix Probability Grid (%)</div>
              <VTable density="comfortable" class="cohort-matrix border rounded">
                <thead>
                  <tr>
                    <th class="cohort-matrix__sticky">From / To</th>
                    <th v-for="to in transitionMatrix.columns" :key="to" class="text-end text-no-wrap">
                      {{ cohortName(to) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in transitionMatrix.rows" :key="row.id">
                    <td class="cohort-matrix__sticky text-no-wrap">
                      <span class="cohort-matrix__dot" :style="{ backgroundColor: cohortColor(row.id) }" />
                      <span class="font-weight-medium">{{ cohortName(row.id) }}</span>
                    </td>
                    <td v-for="cell in row.cells" :key="cell.to" class="text-end">
                      <span class="cohort-matrix__cell">
                        {{ cell.pct }}
                        <VTooltip activator="parent" location="top">
                          {{ cohortName(row.id) }} → {{ cohortName(cell.to) }}: {{ fmtNum(cell.count) }} users
                        </VTooltip>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </div>
        </VExpandTransition>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VCard :loading="isCohortsLoading">
        <VCardItem>
          <VCardTitle>Cohort Distribution</VCardTitle>
          <VCardSubtitle v-if="cohortsData?.totalUsers != null">
            {{ fmtNum(cohortsData.totalUsers) }} users
          </VCardSubtitle>
          <template #append>
            <AppDateTimePicker
              v-model="cohortDate"
              style="width: 180px;"
              density="compact"
              prepend-inner-icon="tabler-calendar"
              :config="{ dateFormat: 'd-m-Y', maxDate: yesterday }"
            />
          </template>
        </VCardItem>

        <VCardText>
          <VChart v-if="cohortsOption" class="cohort-bar" :option="cohortsOption" autoresize />
          <div v-else class="cohort-empty text-medium-emphasis">
            {{ isCohortsLoading ? "Loading..." : "No cohort data for this date" }}
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.cohort-sankey {
  height: 480px;
}
.cohort-bar {
  height: 420px;
}
.cohort-matrix__sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}
.cohort-matrix__cell {
  cursor: default;
}
.cohort-matrix__dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 50%;
}
.cohort-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}
</style>
