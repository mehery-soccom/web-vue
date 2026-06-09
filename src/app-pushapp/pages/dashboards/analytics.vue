<script setup>
import CardStatisticsTransactions from '@/app-pushapp/views/dashboards/event/CardStatisticsTransactions.vue';
import ChartJsLineChart from '@/app-pushapp/views/dashboards/analytics/ChartJsLineChart.vue';
import { useProjectStore } from "@app-pushapp/views/dashboards/analytics/useProjectStore";
import { useDatePickerFilters } from "@app-insights360/views/dashboards/analytics/useDatePickerFilters";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";
import { ref, onMounted, toRaw, nextTick } from "vue";
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const { customPlugin } = useDatePickerFilters();
const projectStore = useProjectStore();

const chartCard = ref(null);
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
oneWeekAgo.setHours(0,0,0,0);
const formattedStart = oneWeekAgo.toLocaleDateString("en-GB").split("/").join("-");
const formattedEnd = today.toLocaleDateString("en-GB").split("/").join("-");
const dates = `${formattedStart} to ${formattedEnd}`;
var dateRange = ref(dates);
const globalDateRange = ref([]);
const chartKey = ref(0);

const uiLegends = [ "New", "Uninstalled" ];
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
const statsDauCount = ref([
  {
    title: "DAU Count (Today)",
    stats: "0",
    icon: "tabler-user-plus",
    color: "primary",
  }
]);
const statsDau = ref([
  {
    title: "Notifications Opened",
    stats: "0",
    icon: "tabler-bell",
    color: "primary",
  },
  {
    title: "App Event",
    stats: "0",
    icon: "tabler-bolt",
    color: "info",
  },
  {
    title: "App Engagement",
    stats: "0",
    icon: "tabler-heart-handshake",
    color: "error",
  },
  {
    title: "Profile Update",
    stats: "0",
    icon: "tabler-user-edit",
    color: "success",
  },
]);
const statsMauCount = ref([
  {
    title: "MAU Count",
    stats: "0",
    icon: "tabler-user-plus",
    color: "primary",
  }
]);
const statsMau = ref([
  {
    title: "Notifications Opened",
    stats: "0",
    icon: "tabler-bell",
    color: "primary",
  },
  {
    title: "App Event",
    stats: "0",
    icon: "tabler-bolt",
    color: "info",
  },
  {
    title: "App Engagement",
    stats: "0",
    icon: "tabler-heart-handshake",
    color: "error",
  },
  {
    title: "Profile Update",
    stats: "0",
    icon: "tabler-user-edit",
    color: "success",
  },
]);

const fetchDauMauData = async (type, period) => {
  try{
    const resp = await projectStore.fetchDauMauDatas({ type, period })
    const item = resp?.data?.data?.[0] || {};
    if(type == 'MAU'){
      statsMauCount.value[0].stats = String(item.count || 0);
      const currentMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
      statsMauCount.value[0].title = period === currentMonth ? "MAU Count (This Month)" : "MAU Count";
      statsMau.value[0].stats = String(item.primaryEvents?.notifications || 0);
      statsMau.value[1].stats = String(item.primaryEvents?.event_activity || 0);
      statsMau.value[2].stats = String(item.primaryEvents?.in_app_engagement || 0);
      statsMau.value[3].stats = String(item.primaryEvents?.profile_update || 0);
    } else {
      statsDauCount.value[0].stats = String(item.count || 0);
      statsDau.value[0].stats = String(item.primaryEvents?.notifications || 0);
      statsDau.value[1].stats = String(item.primaryEvents?.event_activity || 0);
      statsDau.value[2].stats = String(item.primaryEvents?.in_app_engagement || 0);
      statsDau.value[3].stats = String(item.primaryEvents?.profile_update || 0);
    }
    console.log("resp", resp.data[0])
  }catch(e){
    console.error(e)
  }
};

const todayMonthValue = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
const selectedMonth = ref(todayMonthValue);
const selectedMonthOptions = computed(() => {
  const options = [];
  const start = new Date(2026, 2);
  const today = new Date();
  const current = new Date(start);

  while (current.getFullYear() < today.getFullYear() || (current.getFullYear() === today.getFullYear() && current.getMonth() <= today.getMonth())) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    options.push({
      label: current.toLocaleString("default", { month: "short", year: "2-digit" }),
      value: `${year}${String(month).padStart(2, "0")}`,
    });
    current.setMonth(current.getMonth() + 1);
  }
  return options.reverse();
});

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
      if (isSingleDay) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${day}/${month}`;
      }
      // return isSingleDay ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : date.toLocaleDateString("en-GB");
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
          labels: {
            boxWidth: 15,
            boxHeight: 15,
            usePointStyle: true,
            pointStyle: 'rect',
          },
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
const downloadImage = async () => {
  if (!chartCard.value?.$el) return;
  const fileName = `Device_Analytics_${dateRange.value}.png`.replace(/\s+/g, '_');
  const canvas = await html2canvas(chartCard.value.$el, { useCORS: true, backgroundColor: null });
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
const exportToExcel = () => {
  if (!chartData.value?.datasets?.length) return;
  const formattedData = chartData.value.labels.map((label, i) => {
    const row = { Time: label };
    chartData.value.datasets.forEach(ds => {
      row[ds.label] = ds.data[i];
    });
    return row;
  });
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Device Analytics");
  const fileName = `Device_Analytics_${dateRange.value}.xlsx`.replace(/\s+/g, '_');
  XLSX.writeFile(workbook, fileName);
};
const onChartDateChange = ([start, end]) => {
  const from = new Date(start);
  from.setHours(0,0,0,0);
  const to = new Date(end);
  to.setHours(23,59,59,999);
  globalDateRange.value = [from, to];
  fetchChartData(from, to);
};
onMounted(async () => {
  globalDateRange.value = [oneWeekAgo, today];
  await fetchChartData(oneWeekAgo, today);
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const DauDate = `${today.getFullYear()}${month}${day}`;
  await fetchDauMauData("DAU", DauDate);
  const MauDate = `${today.getFullYear()}${month}`;
  await fetchDauMauData("MAU", MauDate);
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
    <VRow>
      <VCol cols="12" md="3">
        <CardStatisticsTransactions
          :statistics="statsDauCount"
          :title="'Daily Active Users'"
        />
      </VCol>
      <VCol cols="12" md="9">
        <CardStatisticsTransactions
          :statistics="statsDau"
          :title="'DAU Statistics'"
        />
      </VCol>
    </VRow>
    <div>
      <div style="width: 100%;margin-top: 10px; display: flex; justify-content: flex-end;">
        <AppSelect
            v-model="selectedMonth"
            :items="selectedMonthOptions"
            item-title="label"
            item-value="value"
            class="mb-2" :style="{ width: '180px', marginLeft: 'auto'}"
            @update:modelValue="fetchDauMauData('MAU', selectedMonth)"
          />
      </div>
      <VRow>
        <VCol cols="12" md="3">
          <CardStatisticsTransactions
            :statistics="statsMauCount"
            :title="'Monthly Active Users'"
          />
        </VCol>
        <VCol cols="12" md="9">
          <CardStatisticsTransactions
            :statistics="statsMau"
            :title="'MAU Statistics'"
          />
        </VCol>
      </VRow>
    </div>
    <VRow justify="center">
      <!-- <VCol cols="12" md="1.5"></VCol> -->
      <VCol cols="12" md="12" style="height: calc(100vh - 150px);">
        <VCard ref="chartCard" style="height: 100%;">
          <VCardItem class="pb-0 pt-3">
            <template #append>
              <div class="d-flex align-center gap-2">
                <AppDateTimePicker
                  v-model="dateRange"
                  prepend-inner-icon="tabler-calendar"
                  style="width: 220px;"
                  :config="{
                    mode: 'range',
                    dateFormat: 'd-m',
                    maxDate: tonight,
                    onClose: onDateClosed,
                    plugins: [customPlugin]
                  }"
                />
                <VMenu transition="scale-transition" open-on-hover>
                  <template #activator="{ props }">
                    <VBtn
                      icon="tabler-download"
                      variant="tonal"
                      color="secondary"
                      size="small"
                      v-bind="props"
                      :disabled="!chartData?.datasets?.length"
                    />
                  </template>
                  <VList density="compact">
                    <VListItem @click="downloadImage">
                      <template #prepend>
                        <VIcon icon="tabler-photo" size="18" class="me-2" />
                      </template>
                      <VListItemTitle>Download Image</VListItemTitle>
                    </VListItem>
                    <VListItem @click="exportToExcel">
                      <template #prepend>
                        <VIcon icon="tabler-file-spreadsheet" size="18" class="me-2" />
                      </template>
                      <VListItemTitle>Download Excel</VListItemTitle>
                    </VListItem>
                  </VList>
                </VMenu>
              </div>
            </template>
          </VCardItem>
          <VCardText style="height: calc(100% - 50px); padding: 0;">
            <MyChartComponent
              type="line" :key="chartKey"
              :data="chartData"
              :chartOption="chartOptions"
              :colors="chartJsCustomColors"
              :title="'Device Statistics'"
              :modelValue="globalDateRange"
              :enableDatePicker="false"
              @dateChange="onChartDateChange"
            />
          </VCardText>
        </VCard>
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