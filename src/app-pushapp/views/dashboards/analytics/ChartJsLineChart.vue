<script setup>
import { getLineChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig";
import LineChart from "@app-pushapp/@core/libs/chartjs/components/LineChart";
import { useTheme } from "vuetify";

const props = defineProps({
  colors: {
    type: Object,
    required: false,
  },
  data: {
    type: Object,
    required: true,
  },
  chartOption: {
    type: Object,
    required: false,
  },
});

const vuetifyTheme = useTheme();
const chartConfig = computed(() =>
  getLineChartConfig(vuetifyTheme.current.value)
);
</script>

<template>
  <LineChart
    :chart-options="chartOption || chartConfig"
    :height="200"
    :chart-data="data"
  />
</template>
