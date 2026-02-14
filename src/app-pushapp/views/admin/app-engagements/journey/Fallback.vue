<script setup>
import { buildInternalState, hydrateJourney, buildJourney } from "./utils";
import { ListenerRegistry } from "./schemas/listeners";
import Listener from "./Listener.vue";

const props = defineProps({
  modelValue: Object,
});

const emit = defineEmits(["update:modelValue"]);

const state = reactive(buildInternalState());

onMounted(() => {
  console.log("onMounted");

  hydrateJourney(props.modelValue, state);
});

watch(
  () => state,
  () => {
    console.log("state updated");

    const s = buildJourney(state);
    emit("update:modelValue", s);
    noListenerError.value = false;
  },
  { deep: true }
);

const listenerRefs = ref({});
const noListenerError = ref(false);
const isValid = async (silent = false) => {
  let ok = true;
  let hasAtLeastOneListener = false;

  for (const key of Object.keys(state.listeners)) {
    const listenerState = state.listeners[key];
    const r = listenerRefs.value[key];

    if (!listenerState?.enabled) continue;

    hasAtLeastOneListener = true;

    if (!r) continue;

    ok = r.isValid(silent) && ok;
  }

  if (!hasAtLeastOneListener) {
    ok = false;

    if (!silent) {
      noListenerError.value = true;
    }
  }

  console.log("Fallback ok ", ok);
  return ok;
};

defineExpose({ isValid });
</script>

<template>
  <VAlert v-if="noListenerError" type="error" variant="tonal" class="mb-3">
    At least one fallback listener is required
  </VAlert>

  <Listener
    v-for="(schema, key) in ListenerRegistry"
    :key="key"
    :listener-key="key"
    v-model="state.listeners[key]"
    :ref="(el) => (listenerRefs[key] = el)"
  />
</template>
