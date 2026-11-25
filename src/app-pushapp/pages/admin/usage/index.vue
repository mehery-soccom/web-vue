<script setup>
import DataService from "@/@common/services/DataService";
import CardStatisticsHorizontal from "@/app-pushapp/@core/components/cards/CardStatisticsHorizontal.vue";

const { show } = inject("snackbar");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FIRST_MONTH = new Date(2026, 7, 1);
const monthOptions = (() => {
  const options = [];
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let date = new Date(FIRST_MONTH); date <= current; date.setMonth(date.getMonth() + 1)) {
    const month = date.getMonth();
    const year = date.getFullYear();
    options.push({
      title: `${MONTHS[month]} ${String(year).slice(-2)}`,
      value: `${year}-${String(month + 1).padStart(2, "0")}`,
    });
  }
  return options;
})();

const selectedMonth = ref(monthOptions[monthOptions.length - 1].value);
const isLoading = ref(false);
const costLabel = ref("0.00 USD");

let billingAbort = null;

const isAborted = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const toApiDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}${month}${date.getFullYear()}`;
};

const monthBounds = (value) => {
  const [year, month] = String(value).split("-").map(Number);
  return {
    start: toApiDate(new Date(year, month - 1, 1)),
    end: toApiDate(new Date(year, month, 0)),
  };
};

const formatCost = (amount, currency) => {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const code = String(currency || "usd").toUpperCase();
  return `${safe.toFixed(2)} ${code}`;
};

const loadBilling = async () => {
  billingAbort?.abort();
  const controller = new AbortController();
  billingAbort = controller;
  isLoading.value = true;

  // const tenant =
  //   window.CONST?.CONFIG?.SETUP?.TENANT ||
  //   window.CONST?.CONFIG?.tenant ||
  //   "demo";
  const { start, end } = monthBounds(selectedMonth.value);

  try {
    const res = await DataService.axios.get("/api/v1/analytics/billing/agentic", {
      params: { start, end },
      signal: controller.signal,
    });
    const rows = res?.data?.data || [];
    const total = rows.reduce((sum, row) => sum + (Number(row?.cost?.total) || 0), 0);
    const currency = rows.find((row) => row?.cost?.currency)?.cost?.currency;
    costLabel.value = formatCost(total, currency);
  } catch (error) {
    if (isAborted(error)) return;
    const apiErr = error.response?.data;
    show({
      message: apiErr?.error?.message || apiErr?.message || "Failed to load usage",
      color: "error",
    });
    costLabel.value = formatCost(0, "usd");
  } finally {
    if (billingAbort === controller) isLoading.value = false;
  }
};

watch(selectedMonth, loadBilling);
onMounted(loadBilling);
onBeforeUnmount(() => {
  billingAbort?.abort();
});
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-4">
      <div>
        <h3 class="mb-1">Usage</h3>
      </div>
      <VSelect
        v-model="selectedMonth"
        :items="monthOptions"
        label="Month"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 180px;"
      />
    </div>

    <VRow>
      <VCol cols="12" sm="6" md="4" lg="3">
        <CardStatisticsHorizontal
          title="LLM Cost"
          :stats="isLoading ? '...' : costLabel"
          icon="tabler-currency-dollar"
          color="primary"
        />
      </VCol>
    </VRow>
  </div>
</template>
