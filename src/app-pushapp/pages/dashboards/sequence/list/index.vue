<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSequenceStore } from '@app-pushapp/views/dashboards/sequence/useSequenceStore'; 
import { useCohortsStore } from '@app-pushapp/views/admin/cohorts/useCohortsStore';
import { inject } from 'vue';
import { useTheme } from "vuetify";
import AppDateTimePicker from "@/app-tikat/@core/components/app-form-elements/AppDateTimePicker.vue";
import { useDatePickerFilters } from "@app-tikat/views/dashboard/analytics/useDatePickerFilters";
import { getLatestBarChartConfig } from "@app-pushapp/@core/libs/chartjs/chartjsConfig";
import BarChart from "@app-pushapp/@core/libs/chartjs/components/BarChart";
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const router = useRouter();
const store = useSequenceStore();
const cohortsStore = useCohortsStore();
const { customPlugin } = useDatePickerFilters();
const show = inject("snackbar", () => {}); 
const vuetifyTheme = useTheme();

const isLoading = ref(false);
const isDeleteDialogOpen = ref(false);
const sequenceToDelete = ref(null);
const selectedSequence = ref(null);

// Chart & Filter States
const isChartLoading = ref(false);
const selectedCohortA = ref(null);
const selectedCohortB = ref(null);
const isCompareMode = ref(false);
const chartDataRaw = ref({});
const chartCard = ref(null);

// Date Logic: Default last 7 days
const tonight = new Date().setHours(23, 59, 59, 999);
const formatDate = (date) => date.toLocaleDateString("en-GB").split("/").join("-");
const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 6));
const dateRange = ref(`${formatDate(sevenDaysAgo)} to ${formatDate(new Date())}`);

const formattedCohortList = computed(() => {
  return cohortsStore.cohorts
    .map(c => ({ title: c.name, value: c._id }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

// Helper to get cohort name from ID for chart labels
const getCohortName = (id) => {
  const cohort = cohortsStore.cohorts.find(c => c._id === id);
  return cohort ? cohort.name : (id || 'All Users');
};

// Helper to format ms into human readable time
const formatMs = (ms) => {
  if (!ms) return '0s';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  
  let str = '';
  if (hours > 0) str += `${hours}h `;
  if (minutes > 0) str += `${minutes}m `;
  if (seconds > 0 || str === '') str += `${seconds}s`;
  return str.trim();
};

onMounted(async () => {
  loadSequences();
  
  try {
    const res = await cohortsStore.fetchCohorts({ paginate: false });
    cohortsStore.cohorts = res.data?.results || res.results || [];
  } catch(e) {
    console.error("Failed to fetch cohorts", e);
  }
});

const loadSequences = async () => {
  isLoading.value = true;
  try {
    await store.fetchSequences();
  } catch (error) {
    show({ message: 'Failed to load sequences.', color: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const confirmDelete = (sequence) => {
  sequenceToDelete.value = sequence;
  isDeleteDialogOpen.value = true;
};

const executeDelete = async () => {
  if (!sequenceToDelete.value) return;
  try {
    await store.deleteSequence(sequenceToDelete.value._id);
    show({ message: 'Sequence deleted successfully.', color: 'success' });
    window.location.reload(); 
  } catch (error) {
    show({ message: 'Failed to delete sequence.', color: 'error' });
  } finally {
    isDeleteDialogOpen.value = false;
    sequenceToDelete.value = null;
  }
};

// --- Chart Logic ---
const getStats = async () => {
  if (!selectedSequence.value) return;

  isChartLoading.value = true;
  try {
    const activeSeq = store.sequences.find(s => s._id === selectedSequence.value);
    if (!activeSeq) return;

    const parts = dateRange.value.split(" to ");
    const [sD, sM, sY] = parts[0].split("-").map(Number);
    const [eD, eM, eY] = (parts[1] || parts[0]).split("-").map(Number);
    
    const startTs = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
    const endTs = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();

    // 1. Compare Mode API
    if (isCompareMode.value) {
      if (!selectedCohortA.value || !selectedCohortB.value) {
        chartDataRaw.value = null;
        isChartLoading.value = false;
        return;
      }
      const params = {
        cohortA: selectedCohortA.value,
        cohortB: selectedCohortB.value,
        start: startTs,
        end: endTs,
        sequenceCode: activeSeq.code,
        sequenceId: activeSeq._id
      };
      const res = await store.fetchSequenceComparison(params);
      chartDataRaw.value = { ...res, _type: 'compare' };
    } 
    // 2. Single Cohort API
    else if (selectedCohortA.value) {
      const params = {
        cohortId: selectedCohortA.value,
        start: startTs,
        end: endTs,
        sequenceCode: activeSeq.code,
        sequenceId: activeSeq._id
      };
      const res = await store.fetchSequenceSingleCohort(params);
      chartDataRaw.value = { ...res, _type: 'single' };
    } 
    // 3. No Cohort API
    else {
      const params = {
        start: startTs,
        end: endTs,
        sequenceCode: activeSeq.code,
        sequenceId: activeSeq._id
      };
      const res = await store.fetchSequenceNoCohort(params);
      chartDataRaw.value = { ...res, _type: 'none' };
    }
  } catch (error) {
    console.error(error);
    chartDataRaw.value = {};
  } finally {
    isChartLoading.value = false;
  }
};

const onDateClosed = (selectedDates, dateStr) => {
  if (selectedDates.length === 2) {
    dateRange.value = dateStr;
    getStats();
  }
};

watch([selectedSequence, selectedCohortA, selectedCohortB, isCompareMode], () => {
  getStats();
});

const chartJsData = computed(() => {
  if (!chartDataRaw.value || Object.keys(chartDataRaw.value).length === 0) return null;
  const colors = ['#7367f0', '#00cfe8']; 

  if (chartDataRaw.value._type === 'compare') {
    if (!chartDataRaw.value.cohorts) return null;
    const cohortIds = Object.keys(chartDataRaw.value.cohorts);
    if (cohortIds.length === 0) return null;

    const firstCohort = chartDataRaw.value.cohorts[cohortIds[0]];
    const labels = firstCohort.sequence.map(item => item.step);

    // Find highest totalAttempts across both cohorts for 100% baseline
    const maxAttempts = Math.max(...cohortIds.map(id => chartDataRaw.value.cohorts[id].totalAttempts || 0));

    const datasets = cohortIds.map((id, index) => {
      const cohortData = chartDataRaw.value.cohorts[id].sequence;
      return {
        label: getCohortName(id),
        maxBarThickness: 30,
        backgroundColor: colors[index % colors.length],
        borderColor: "transparent",
        borderRadius: { topRight: 4, topLeft: 4 },
        data: cohortData.map(item => maxAttempts > 0 ? Number(((item.attempts / maxAttempts) * 100).toFixed(1)) : 0),
        customData: cohortData.map(item => ({ attempts: item.attempts, avgTime: item.avgTime }))
      };
    });

    return { labels, datasets };

  } else {
    // Single or No Cohort Mode
    if (!chartDataRaw.value.sequence) return null;
    const labels = chartDataRaw.value.sequence.map(item => item.step);
    const maxAttempts = chartDataRaw.value.totalAttempts || 0;
    
    const datasetLabel = chartDataRaw.value._type === 'single' 
      ? getCohortName(chartDataRaw.value.cohortId) 
      : 'All Users';

    return {
      labels,
      datasets: [{
        label: datasetLabel,
        maxBarThickness: 30,
        backgroundColor: colors[0],
        borderColor: "transparent",
        borderRadius: { topRight: 4, topLeft: 4 },
        data: chartDataRaw.value.sequence.map(item => maxAttempts > 0 ? Number(((item.attempts / maxAttempts) * 100).toFixed(1)) : 0),
        customData: chartDataRaw.value.sequence.map(item => ({ attempts: item.attempts, avgTime: item.avgTime }))
      }]
    };
  }
});

const chartJsOptions = computed(() => {
  const config = getLatestBarChartConfig(vuetifyTheme.current.value);
  return {
    ...config,
    scales: {
      ...config.scales,
      x: {
        ...config.scales.x,
        title: { display: true, text: 'Steps', font: { weight: 'bold' } }
      },
      y: {
        ...config.scales.y,
        min: 0,
        max: 100, // Fixed max to 100%
        ticks: { stepSize: 20 },
        title: { display: true, text: 'Percentage (%)', font: { weight: 'bold' } }
      }
    },
    plugins: {
      ...config.plugins,
      tooltip: {
        callbacks: {
          label: (context) => {
            const custom = context.dataset.customData[context.dataIndex];
            return [
              `${context.dataset.label}: ${context.raw}%`,
              `Count: ${custom.attempts}`,
              `Avg Time: ${formatMs(custom.avgTime)}`
            ];
          }
        }
      }
    }
  };
});

// --- Exports ---
const downloadImage = async () => {
  if (!chartCard.value.$el) return;
  const fileName = `Sequence_Analytics_${dateRange.value}.png`.replace(/\s+/g, '_');
  const canvas = await html2canvas(chartCard.value.$el, { useCORS: true, backgroundColor: null });
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

const exportToExcel = () => {
  if (!chartDataRaw.value) return;
  
  let formattedData = [];

  if (chartDataRaw.value._type === 'compare') {
    const cohortIds = Object.keys(chartDataRaw.value.cohorts);
    if (cohortIds.length === 0) return;
    const firstCohort = chartDataRaw.value.cohorts[cohortIds[0]];
    const maxAttempts = Math.max(...cohortIds.map(id => chartDataRaw.value.cohorts[id].totalAttempts || 0));

    formattedData = firstCohort.sequence.map((item, index) => {
      const row = { Step: item.step };
      cohortIds.forEach(id => {
        const cohortName = getCohortName(id);
        const sequenceData = chartDataRaw.value.cohorts[id].sequence[index];
        const attempts = sequenceData.attempts;
        const avgTime = sequenceData.avgTime;

        row[`${cohortName} (Count)`] = attempts;
        row[`${cohortName} (%)`] = maxAttempts > 0 ? Number(((attempts / maxAttempts) * 100).toFixed(1)) : 0;
        row[`${cohortName} (Avg Time)`] = formatMs(avgTime);
      });
      return row;
    });
  } else {
    const maxAttempts = chartDataRaw.value.totalAttempts || 0;
    formattedData = chartDataRaw.value.sequence.map(item => ({
      Step: item.step,
      "Attempts (Count)": item.attempts,
      "Percentage (%)": maxAttempts > 0 ? Number(((item.attempts / maxAttempts) * 100).toFixed(1)) : 0,
      "Avg Time": formatMs(item.avgTime)
    }));
  }

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sequence Analytics");

  const fileName = `Sequence_Analytics_${dateRange.value}.xlsx`.replace(/\s+/g, '_');
  XLSX.writeFile(workbook, fileName);
};
</script>

<template>
  <div>
    <VRow>
      <VCol cols="12" class="d-flex justify-space-between align-center mb-4">
        <h2 class="text-h4 font-weight-medium">Sequence Analytics</h2>
        
        <VTooltip location="bottom" :disabled="store.sequences.length < 5">
          <template #activator="{ props }">
            <span v-bind="props">
              <VBtn 
                color="primary" 
                prepend-icon="tabler-plus" 
                @click="router.push({ name: 'dashboards-sequence-add-id?' })"
                :disabled="store.sequences.length >= 5"
              >
                Add Sequence
              </VBtn>
            </span>
          </template>
          <span>You can create up to 5 sequences only.</span>
        </VTooltip>
      </VCol>

      <VCol cols="12">
        <div v-if="store.sequences.length > 0">
          <VBtnToggle 
            v-model="selectedSequence" 
            color="primary" 
            variant="text"
            class="gap-2 flex-wrap"
           >
            <VBtn 
                v-for="sequence in store.sequences" 
                :key="sequence._id" 
                :value="sequence._id"
                rounded="lg"
                class="pe-2"
             >
              {{ sequence.name }}
              
              <VMenu>
                <template #activator="{ props }">
                  <VIcon
                    v-bind="props"
                    icon="tabler-dots-vertical"
                    size="small"
                    class="ml-2 text-disabled"
                    @click.stop
                  />
                </template>
                <VList density="compact">
                  <VListItem @click="confirmDelete(sequence)">
                    <template #prepend>
                      <VIcon color="error" icon="tabler-trash" class="mr-2" size="small" />
                    </template>
                    <VListItemTitle class="text-error">Delete Sequence</VListItemTitle>
                  </VListItem>
                </VList>
              </VMenu>
            </VBtn>
          </VBtnToggle>
        </div>
        
        <VCard v-else-if="!isLoading" class="text-center pa-10">
          <VIcon size="64" color="disabled" class="mb-4">tabler-route</VIcon>
          <h3 class="text-h6 text-disabled">No Sequences Found</h3>
          <p class="text-body-2 text-disabled mt-2">Click "Add Sequence" to create your first funnel.</p>
        </VCard>
      </VCol>

      <VCol cols="12" v-if="!selectedSequence && store.sequences.length > 0">
        <VCard class="text-center pa-10 border-dashed" variant="outlined">
          <VIcon size="48" color="disabled" class="mb-4">tabler-click</VIcon>
          <h3 class="text-h6 text-disabled">Please Select a Sequence</h3>
          <p class="text-body-2 text-disabled mt-2">Click on any of the sequences above to view their analytics.</p>
        </VCard>
      </VCol>

      <VCol cols="12" v-if="selectedSequence">
        <VCard ref="chartCard" class="mt-4">
          <VCardItem class="pb-0">
            <div class="d-flex align-center justify-space-between flex-wrap gap-4 pt-3">
              <VCardTitle class="text-h5 font-weight-bold text-primary">
                {{ isCompareMode ? 'Compare Cohorts' : 'Cohort Analysis' }}
              </VCardTitle>
              
              <div class="d-flex gap-4 align-center flex-wrap">
                <VSelect
                  v-model="selectedCohortA"
                  :items="formattedCohortList"
                  label="Cohort"
                  placeholder="Select Cohort"
                  density="compact"
                  clearable
                  style="min-width: 200px;"
                />

                <VTooltip location="top" v-if="!isCompareMode">
                  <template #activator="{ props }">
                    <VBtn 
                      icon="tabler-plus"
                      variant="tonal" 
                      size="small" 
                      color="primary"
                      class="mt-1"
                      v-bind="props"
                      @click="isCompareMode = true"
                    />
                  </template>
                  <span>Compare Cohorts</span>
                </VTooltip>

                <template v-else>
                  <span class="text-subtitle-1 font-weight-bold mt-1 text-disabled">VS</span>

                  <VSelect
                    v-model="selectedCohortB"
                    :items="formattedCohortList"
                    label="Cohort B"
                    placeholder="Select Cohort B"
                    density="compact"
                    clearable
                    style="min-width: 200px;"
                  />

                  <VBtn 
                    icon="tabler-x" 
                    variant="text" 
                    color="error" 
                    size="small" 
                    class="mt-1"
                    @click="isCompareMode = false; selectedCohortB = null;"
                  />
                </template>

                <AppDateTimePicker
                  v-model="dateRange"
                  style="width: 280px"
                  prepend-inner-icon="tabler-calendar"
                  :config="{ 
                    mode: 'range', 
                    dateFormat: 'd-m-Y', 
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
                      v-bind="props"
                      :disabled="!chartJsData"
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
            </div>
          </VCardItem>

          <VCardText v-if="isChartLoading" class="text-center py-10 mt-4">
            <VProgressCircular indeterminate color="primary" />
          </VCardText>

          <VCardText v-else-if="chartJsData" class="pt-6">
            <BarChart 
              :height="400" 
              :chart-data="chartJsData" 
              :chart-options="chartJsOptions" 
            />
          </VCardText>
          
          <VCardText v-else class="text-center py-10 text-disabled mt-4">
            {{ isCompareMode ? 'Please select Cohort A and Cohort B to compare sequence steps.' : 'No data available for the selected parameters.' }}
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="isDeleteDialogOpen" max-width="500">
      <VCard>
        <VCardTitle class="text-h5 pt-4 px-4">Delete Sequence</VCardTitle>
        <VCardText class="pt-2">
          Are you sure you want to delete this? This action cannot be undone, and all related data will be permanently removed.
        </VCardText>
        <VCardActions class="pb-4 px-4">
          <VSpacer />
          <VBtn variant="tonal" color="secondary" @click="isDeleteDialogOpen = false">Cancel</VBtn>
          <VBtn variant="flat" color="error" @click="executeDelete">Delete</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.border-dashed {
  border: 2px dashed rgba(var(--v-border-color), 0.3);
}
</style>