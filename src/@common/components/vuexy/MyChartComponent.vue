<script setup>
import { ref, onMounted, watch } from "vue";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";
import ChartJsLineChart from "@/app-pushapp/views/dashboards/analytics/ChartJsLineChart.vue";
// later you can add:
// import ChartJsBarChart from "...";
// import ChartJsPieChart from "...";
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const props = defineProps({
  type: { type: String, required: true }, // line, bar, pie
  data: { type: Object, required: true },
  chartOption: { type: Object, default: () => ({}) },
  colors: { type: Object, default: () => ({}) },
  title: { type: String, required: false },
  subHeader: { type: String, required: false },

  // datepicker config
  modelValue: { type: Array, default: () => [] }, // global date
  enableDatePicker: { type: Boolean, default: false },
  dateConfig: { type: Object, default: () => ({}) },

  // download config
  enableDownload: { type: Boolean, default: false },
  downloadConfig: {type: Object, default: () => ({
      fileName: 'chart',
      types: ['image', 'excel'],
      url: null,
      sheetName: 'Sheet1',
    })
  }
});

const emit = defineEmits(["dateChange"]);

const localDate = ref([]);
const pickerKey = ref(0);
const cardRef = ref(null);
const isDownloading = ref(false);

watch(() => props.modelValue, (val) => {
  if (val?.length === 2) {
    localDate.value = [...val];
    pickerKey.value++;
  }}, { immediate: true }
);

const onDateClosed = (selectedDates, dateStr) => {
  if (selectedDates?.length === 2) {
    localDate.value = selectedDates;
    emit("dateChange", selectedDates);
  }
};
const downloadImage = async () => {
  if (!cardRef.value) return;
  isDownloading.value = true;
  try {
    const el = cardRef.value.$el || cardRef.value;
    
    const canvas = await html2canvas(el, { 
      useCORS: true, 
      backgroundColor: null,
      onclone: (clonedDoc) => {
        const clonedInput = clonedDoc.querySelector('.v-card input');
        if (clonedInput) {
          const liveValue = document.querySelector('.v-card input')?.value || '';
          const liveInputEl = document.querySelector('.v-card input');
          const computed = window.getComputedStyle(liveInputEl);
          
          clonedInput.style.visibility = 'hidden';
          const span = clonedDoc.createElement('span');
          span.textContent = liveValue;
          span.style.cssText = `
            position: absolute;
            top: 50%;
            left: ${computed.paddingLeft};
            transform: translateY(-50%);
            font-size: ${computed.fontSize};
            font-family: ${computed.fontFamily};
            color: ${computed.color};
            pointer-events: none;
          `;
          clonedInput.parentElement.style.position = 'relative';
          clonedInput.parentElement.appendChild(span);
        }
      }
    });
    const link = document.createElement('a');
    link.download = `${props.downloadConfig.fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    isDownloading.value = false;
  }
};
const downloadDataExcel = () => {
  if (!props.data?.datasets?.length) return;
  isDownloading.value = true;
  try {
    const formattedData = props.data.labels.map((label, i) => {
      const row = { Label: label };
      props.data.datasets.forEach(ds => {
        row[ds.label || `Series ${i + 1}`] = ds.data[i];
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, props.downloadConfig.sheetName);
    XLSX.writeFile(workbook, `${props.downloadConfig.fileName}.xlsx`);
  } finally {
    isDownloading.value = false;
  }
};
const downloadUrlExcel = async () => {
  if (!props.downloadConfig.url) return;
  isDownloading.value = true;
  try {
    const response = await fetch(props.downloadConfig.url);
    const json = await response.json();
    const results = json?.results || json?.data || json || [];
    if (!results.length) return;
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, props.downloadConfig.sheetName);
    XLSX.writeFile(workbook, `${props.downloadConfig.fileName}.xlsx`);
  } finally {
    isDownloading.value = false;
  }
};

const hasDownload = (type) => props.downloadConfig.types.includes(type);
</script>

<template>
  <VCard ref="cardRef" style="height: 100%;">
    <!-- <div v-if="enableDatePicker" class="pa-2" style="max-width: 250px;">
      <AppDateTimePicker
        :key="pickerKey"
        v-model="localDate"
        :config="{
          ...dateConfig,
          // onClose: onDateClosed,
        }"
        @on-close="onDateClosed"
      />
    </div> -->
    <template #title>
      <div class="d-flex align-center justify-space-between w-100">
        <div>
          <div class="text-h4">{{ title }}</div>
          <div v-if="subHeader" class="text-caption text-medium-emphasis"> {{ subHeader }} </div>
        </div>

        <div class="d-flex align-center gap-2">
          <VMenu v-if="enableDownload" transition="scale-transition" open-on-hover>
            <template #activator="{ props: menuProps }">
              <VBtn
                icon="tabler-download"
                variant="tonal"
                color="secondary"
                size="small"
                v-bind="menuProps"
                :loading="isDownloading"
                :disabled="isDownloading"
              />
            </template>
            <VList density="compact">
              <VListItem v-if="hasDownload('image')" @click="downloadImage">
                <template #prepend>
                  <VIcon icon="tabler-photo" size="18" class="me-2" />
                </template>
                <VListItemTitle>Download Image</VListItemTitle>
              </VListItem>

              <VListItem v-if="hasDownload('excel')" @click="downloadDataExcel">
                <template #prepend>
                  <VIcon icon="tabler-file-spreadsheet" size="18" class="me-2" />
                </template>
                <VListItemTitle>Download Excel</VListItemTitle>
              </VListItem>

              <VListItem v-if="hasDownload('url')" @click="downloadUrlExcel">
                <template #prepend>
                  <VIcon icon="tabler-file-spreadsheet" size="18" class="me-2" />
                </template>
                <VListItemTitle>Download Report</VListItemTitle>
              </VListItem>
            </VList>
          </VMenu>
          <div v-if="enableDatePicker" style="width: 180px;">
            <AppDateTimePicker
              :key="pickerKey"
              v-model="localDate"
              prepend-inner-icon="tabler-calendar"
              :config="{ ...dateConfig }"
              @on-close="onDateClosed"
            />
          </div>

        </div>
      </div>
    </template>

    <VCardText style="height: calc(100% - 70px);">
      <ChartJsLineChart
        v-if="type === 'line'"
        :data="data"
        :chartOption="chartOption"
        :colors="colors"
      />

      <!-- Future -->
      <!--
        <ChartJsBarChart v-else-if="type === 'bar'" ... />
        <ChartJsPieChart v-else-if="type === 'pie'" ... />
      -->

      <div v-else class="text-center text-grey">
        Unsupported chart type
      </div>
    </VCardText>
  </VCard>
</template>

<style>
.v-card > .v-card-item{
  padding-bottom: 6px !important;
}
</style>