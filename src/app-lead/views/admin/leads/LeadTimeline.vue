<script setup>
import { computed, onMounted } from 'vue';

const props = defineProps({
  history: {
    type: Array,
    required: true,
    default: () => []
  }
});

const formatDate = (timestampObj) => {
  if (!timestampObj) return { date: '', time: '' };

  const rawStamp = typeof timestampObj === 'number' ? timestampObj : (timestampObj.stamp ?? timestampObj);
  const stampNum = Number(rawStamp);
  if (!stampNum || Number.isNaN(stampNum)) return { date: '', time: '' };

  const date = new Date(stampNum);

  const dateOptions = { month: 'short', day: '2-digit', year: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

  return {
    date: new Intl.DateTimeFormat('en-US', dateOptions).format(date), // "Oct 17, 2025"
    time: new Intl.DateTimeFormat('en-US', timeOptions).format(date).toUpperCase() // "02:51 PM"
  };
};

const processedHistory = computed(() => {
  if (!props.history || props.history.length === 0) return [];

  const grouped = props.history.reduce((acc, item, index) => {
    const { date, time } = formatDate(item.timestamp);
    const previousStage = index > 0 ? props.history[index - 1] : null;

    const entry = {
      raw: item,
      time,
      probabilityText: `Probability (%) was updated from a to b`,
      stageText: `Stage was updated from ${previousStage ? previousStage.stagetitle : 'Start'} to ${item.stagetitle}`
    };

    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([date, entries]) => ({ date, entries }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
});

onMounted(() => {
  console.log('LeadTimeline processedHistory', processedHistory.value);
});
</script>

<template>
  <div class="pa-4 px-6">
    <VTimeline side="end" align="start" truncate-line="both" density="compact">
      <template v-for="group in processedHistory" :key="group.date">
        <VTimelineItem dot-color="transparent" size="small">
          <template #opposite>
            <div />
          </template>
          <div class="d-flex justify-space-between align-center">
            <VChip color="primary" size="small" label>{{ group.date }}</VChip>
          </div>
        </VTimelineItem>

        <VTimelineItem
          v-for="(entry, idx) in group.entries"
          :key="idx"
          dot-color="grey-lighten-2"
          size="x-small"
        >
          <template #opposite>
            <div v-if="entry.time" class="text-subtitle-2">{{ entry.time }}</div>
            <div v-else class="text-subtitle-2">—</div>
          </template>

          <div >
            <div class="d-flex justify-space-between items-center mb-1"  >
              <span v-if="entry.time" class="text-subtitle-2">{{ entry.time }}</span>
            </div>

            <p class="mb-1 text-body-1">{{ entry.probabilityText }}</p>
            <p class="text-subtitle-2 font-weight-bold">{{ entry.stageText }}</p>
          </div>
        </VTimelineItem>
      </template>
    </VTimeline>

    <div v-if="processedHistory.length === 0" class="text-center text-grey py-8">
      No lead history available.
    </div>
  </div>
</template>
