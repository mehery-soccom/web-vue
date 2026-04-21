<script setup>
import ChartJsLineChart from '@/app-pushapp/views/dashboards/analytics/ChartJsLineChart.vue';
import { useProjectStore } from "@app-pushapp/views/dashboards/analytics/useProjectStore";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";
import { ref, onMounted, toRaw, nextTick } from "vue";

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();

const chartData = ref({ labels: [], datasets: [] });
const chartOptions = ref({});
const chartJsCustomColors = {
  yellow: "#ffe802",
  primary: "#836af9",
  areaChartBlue: "#2c9aff",
  barChartYellow: "#ffcf5c",
  polarChartGrey: "#4f5d70",
  polarChartInfo: "#299aff",
  lineChartYellow: "#d4e157",
  polarChartGreen: "#28dac6",
  lineChartPrimary: "#9e69fd",
  lineChartWarning: "#ff9800",
  horizontalBarInfo: "#26c6da",
  polarChartWarning: "#ff8131",
  scatterChartGreen: "#28c76f",
  warningShade: "#ffbd1f",
  areaChartBlueLight: "#84d0ff",
  areaChartGreyLight: "#edf1f4",
  scatterChartWarning: "#ff9f43",
};

const oldDates = ref([]);
const today = new Date();
var tonight = new Date();
tonight.setHours(23, 59, 59, 999);
var oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
const formattedStart = oneWeekAgo.toLocaleDateString("en-GB").split("/").join("-");
const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-");
const dates = `${formattedStart} to ${formattedEnd}`;
var dateRange = ref(dates);
const globalDateRange = ref([]);
const chartKey = ref(0);

const uiLegends = [ "New User", "Inactive (7+) / Uninstalled (14+)" ];
const onDateSelect = (selectedDates, dateStr) => {
  console.log("Selected:", selectedDates, dateStr);
};
const onDateUpdate = (selectedDates, dateStr) => {
  console.log("Updated:", selectedDates, dateStr);
};

const onDateClosed = (selectedDates, dateStr) => {
  console.log("Closed:", selectedDates, toRaw(oldDates.value), dateStr);
  if (selectedDates.length === 2) {
    globalDateRange.value = selectedDates;
    const start = new Date(selectedDates[0]);
    start.setHours(0,0,0,0);
    const end = new Date(selectedDates[1]);
    end.setHours(23,59,59,999);
    fetchChartData(start, end);
  }
  // if (selectedDates.length === 2 && toRaw(oldDates.value) != selectedDates) {
  //   oldDates.value = selectedDates;
};
const buildPayload = (fromDate, toDate) => {
  return {
    from: {
      type: "date",
      stamp: new Date(fromDate).getTime(),
      dateUTC: new Date(fromDate).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      date: new Date(fromDate).toLocaleDateString("en-GB"),
      format: "DD/MM/YYYY",
    },
    to: {
      type: "date",
      stamp: new Date(toDate).getTime(),
      dateUTC: new Date(toDate).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      date: new Date(toDate).toLocaleDateString("en-GB"),
      format: "DD/MM/YYYY",
    },
  };
};

const fetchChartData = async (fromDate, toDate) => {
  try {
    const payload = buildPayload(fromDate, toDate);
    const response = await projectStore.fetchChartDatas(payload);
    const result = response?.data;
    if (!result) return;

    const { labels, datasets } = result;
    const isSingleDay = new Date(fromDate).toDateString() === new Date(toDate).toDateString();
    const formattedLabels = labels.map((ts) => {
      const date = new Date(ts);
      return isSingleDay ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : date.toLocaleDateString("en-GB");
    });

    const colorKeys = Object.keys(chartJsCustomColors);
    const formattedDatasets = datasets.map((ds, index) => {
      const color = chartJsCustomColors[colorKeys[index % colorKeys.length]];

      return {
        ...ds,
        label: uiLegends[index] || `Series ${index + 1}`,
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
        borderColor: color,
        backgroundColor: color,
        pointBorderColor: "transparent",
        pointHoverBorderColor: color,
        pointHoverBackgroundColor: color,
      };
    });

    const allValues = formattedDatasets.flatMap((ds) => ds.data);
    const maxY = Math.max(...allValues);
    const yMax = maxY < 5 ? 5 : Math.ceil(maxY * 1.1);

    chartData.value = { labels: formattedLabels, datasets: formattedDatasets,};
    chartOptions.value = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: yMax,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: "Count",
          },
        },
      },
    };
    await nextTick();
    chartKey.value++;  
  } catch (error) {
    console.error("fetchChartData error:", error);
  }
};
const onChartDateChange = ([start, end]) => {
  const from = new Date(start);
  from.setHours(0,0,0,0);
  const to = new Date(end);
  to.setHours(23,59,59,999);

  fetchChartData(from, to);
};
onMounted(async () => {
  globalDateRange.value = [oneWeekAgo, today];
  await fetchChartData(oneWeekAgo, today)
});
</script>

<template>
  <div>
    <!-- <VRow class="match-height">
      <div style="width: 100%; display: flex; justify-content: flex-end;">
        <AppDateTimePicker
          style="width: 300px; margin-left: auto; margin: 0 12px"
          v-model="dateRange"
          prepend-inner-icon="tabler-calendar"
          :config="{
            mode: 'range',
            dateFormat: 'd-m-Y',
            position: 'auto right',
            onChange: onDateSelect,
            maxDate: tonight,
            onValueUpdate: onDateUpdate,
            onClose: onDateClosed,
            plugins: [customPlugin],
          }"
        />
      </div>
    </VRow> -->
    <VRow justify="center">
      <!-- <VCol cols="12" md="1.5"></VCol> -->
      <VCol cols="12" md="11" style="height: calc(100vh - 150px);">
        <MyChartComponent
          type="line" :key="chartKey"
          :data="chartData"
          :chartOption="chartOptions"
          :colors="chartJsCustomColors"
          :title="'Device Statistics'"
          :modelValue="globalDateRange"
          :enableDatePicker="true"
          :dateConfig="{
            mode: 'range',
            dateFormat: 'd-m',
            maxDate: tonight,
            plugins: [customPlugin]
          }"
          @dateChange="onChartDateChange"
        />
      </VCol>
    </VRow>

    <!-- <VRow>
      <VCol cols="12" md="2"></VCol>
      <VCol cols="12" md="8">
        <VCard title="Devices Statistics">
          <VCardText>
            <ChartJsLineChart
              style="width: 100%; height: 80%"
              :colors="chartJsCustomColors"
              :chartOption="chartOptions"
              :data="chartData"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow> -->
  </div>
</template>

<style lang="scss">
@use "@app-pushapp/@core/scss/template/libs/apex-chart.scss";
</style>
<style>
.flatpickr-custom-btn {
  font-size: 12px;
  background: #eee;
  border: 1px solid #ccc;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: black;
}
.flatpickr-custom-btn:hover {
  background-color: #ddd;
}
</style>