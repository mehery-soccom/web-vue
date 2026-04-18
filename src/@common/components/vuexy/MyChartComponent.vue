<script setup>
import { ref, onMounted, watch } from "vue";
import AppDateTimePicker from "@/app-insights360/@core/components/app-form-elements/AppDateTimePicker.vue";
import ChartJsLineChart from "@/app-pushapp/views/dashboards/analytics/ChartJsLineChart.vue";
// later you can add:
// import ChartJsBarChart from "...";
// import ChartJsPieChart from "...";

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
});

const emit = defineEmits(["dateChange"]);

const localDate = ref([]);
const pickerKey = ref(0);

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
</script>

<template>
  <VCard style="height: 100%;">
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
        <div v-if="enableDatePicker" style="width: 150px;">
          <AppDateTimePicker
            :key="pickerKey"
            v-model="localDate"
            :config="{ ...dateConfig }"
            @on-close="onDateClosed"
          />
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