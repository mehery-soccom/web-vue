<script setup>
import { useTheme } from "vuetify";
import { getLatestBarChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig";
import BarChart from "@app-pushapp/@core/libs/chartjs/components/BarChart";
import { PLATFORM_COLORS } from "@app-pushapp/utils/constants";

const props = defineProps({
  colors: {
    type: Object,
    required: false,
  },
  data: {
    type: Object,
    required: true,
  },
});

const vuetifyTheme = useTheme();
const chartOptions = computed(() => {
  let o = getLatestBarChartConfig(vuetifyTheme.current.value);
  let max = props.data.sent_to?.total || 0;

  return {
    ...o,
    scales: {
      ...o.scales,
      x: {
        ...o.scales.x,
      },
      y: {
        ...o.scales.y,
        min: 0,
        max,
        ticks: {
          stepSize: (max / 6).toFixed(),
        },
      },
    },
    plugins: {
      ...o.plugins,
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context) => {
            return "";
          },
          label: (context) => {
            return `${context.dataset.label} : ${context.formattedValue}`;
          },
        },
      },
    },
  };
});

onMounted(async () => {});

const _data = {
  labels: [
    `Sends ( ${(props.data.sent_to.total || 0).toLocaleString("en-IN")} )`,
    `Opens ( ${(props.data.opened.total || 0).toLocaleString("en-IN")} )`,
  ],
  datasets: [
    {
      label: "IOS",
      maxBarThickness: 25,
      backgroundColor: PLATFORM_COLORS.ios.hex,
      borderColor: "transparent",
      // borderRadius: {
      //   topRight: 25,
      //   topLeft: 25,
      // },
      data: [props.data.sent_to.ios, props.data.opened.ios],
    },
    {
      label: "Android",
      maxBarThickness: 25,
      backgroundColor: PLATFORM_COLORS.android.hex,
      borderColor: "transparent",
      // borderRadius: {
      //   topRight: 15,
      //   topLeft: 15,
      // },
      data: [props.data.sent_to.android, props.data.opened.android],
    },
    {
      label: "Huawei",
      maxBarThickness: 25,
      backgroundColor: PLATFORM_COLORS.huawei.hex,
      borderColor: "transparent",
      // borderRadius: {
      //   topRight: 15,
      //   topLeft: 15,
      // },
      data: [props.data.sent_to.huawei, props.data.opened.huawei],
    },
  ],
};
</script>

<template>
  <div class="notification-quick-analytics d-flex justify-center">
    <div>
      <BarChart
        :height="250"
        :chart-data="_data"
        :chart-options="chartOptions"
      />
    </div>
  </div>
</template>

<style lang="scss">
// .notification-quick-analytics {}
</style>
