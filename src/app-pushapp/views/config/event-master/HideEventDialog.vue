<script setup>
import { HIDE_MESSAGE } from "./eventMaster";
import EventKeyChip from "./EventKeyChip.vue";

// Confirm before hiding. Unhide never asks. Parent does the API call on `confirm`.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  event: { type: Object, default: null }, // { eventName, displayLabel }
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "confirm"]);
const close = () => emit("update:modelValue", false);
</script>

<template>
  <VDialog :model-value="props.modelValue" max-width="480" @update:model-value="emit('update:modelValue', $event)">
    <VCard v-if="props.event">
      <VCardItem>
        <VCardTitle>Hide event?</VCardTitle>
      </VCardItem>
      <VCardText>
        <div class="d-flex align-center flex-wrap gap-2 mb-4">
          <span class="text-body-1 font-weight-medium text-high-emphasis">{{ props.event.displayLabel }}</span>
          <EventKeyChip :event-key="props.event.eventName" :copyable="false" />
        </div>
        <p class="text-body-2 mb-0">{{ HIDE_MESSAGE }}</p>
      </VCardText>
      <VCardActions class="justify-end gap-2 pa-4">
        <VBtn color="secondary" variant="tonal" :disabled="props.loading" @click="close">Cancel</VBtn>
        <VBtn color="primary" variant="elevated" prepend-icon="tabler-eye-off" :loading="props.loading" @click="emit('confirm')">
          Hide Event
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
