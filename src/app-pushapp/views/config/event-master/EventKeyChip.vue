<script setup>
import { EVENT_KEY_TOOLTIP } from "./eventMaster";

// Monospace event key with a one-click copy. Used in the list, detail header and details rows.
const props = defineProps({
  eventKey: { type: String, required: true },
  copyable: { type: Boolean, default: true },
});

const copied = ref(false);
const copy = async () => {
  try {
    await window.navigator.clipboard.writeText(props.eventKey);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch (e) {
    console.error("copy failed", e);
  }
};
</script>

<template>
  <span class="event-key-chip d-inline-flex align-center gap-1">
    <VChip size="small" label class="font-mono">
      {{ props.eventKey }}
      <VTooltip activator="parent" location="top">{{ EVENT_KEY_TOOLTIP }}</VTooltip>
    </VChip>
    <IconBtn v-if="props.copyable" size="x-small" @click.stop="copy">
      <VIcon size="14" :icon="copied ? 'tabler-check' : 'tabler-copy'" :color="copied ? 'success' : undefined" />
      <VTooltip activator="parent" location="top">{{ copied ? "Copied" : "Copy event key" }}</VTooltip>
    </IconBtn>
  </span>
</template>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
