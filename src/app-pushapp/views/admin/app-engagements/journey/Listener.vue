<script setup>
import { ListenerRegistry } from "./schemas/listeners";
import { ActionRegistry } from "./schemas/actions";
import SchemaForm from "./schemas/SchemaForm.vue";

const props = defineProps({
  listenerKey: { type: String, required: true },
  modelValue: { type: Object, required: true },
});

const emit = defineEmits(["update:modelValue"]);

const listenerSchema = ListenerRegistry[props.listenerKey];

const actionOptions = Object.keys(ActionRegistry).map((k) => ({
  title: ActionRegistry[k].label,
  value: k,
}));

function update(partial) {
  emit("update:modelValue", {
    ...props.modelValue,
    ...partial,
  });
  actionSelectorError.value = false;
}

function updateFields(fields) {
  update({ fields });
}

function updateAction(type) {
  update({
    action: {
      type,
      config: Object.fromEntries(
        ActionRegistry[type].fields.map((f) => [f.key, null])
      ),
    },
  });
}

function updateActionFields(config) {
  update({
    action: {
      ...props.modelValue.action,
      config,
    },
  });
}

function toggleEnabled(v) {
  update({ enabled: v });
}

const listenerFormRef = ref(null);
const actionFormRef = ref(null);
const actionSelectorError = ref(false);
const isValid = (silent = false) => {
  if (!props.modelValue.enabled) return true;

  let ok = true;

  if (listenerFormRef.value) {
    ok = listenerFormRef.value.isValid(silent) && ok;
  }

  if (!props.modelValue.action?.type) {
    if (!silent) actionSelectorError.value = true;
    return false;
  }

  if (actionFormRef.value) {
    ok = actionFormRef.value.isValid(silent) && ok;
  }

  console.log("Listener", ok);
  return ok;
};

defineExpose({ isValid });
</script>

<template>
  <VCard class="mb-4">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center pa-3">
      <div>
        {{ listenerSchema.label }}
        <VTooltip location="top">
          <template #activator="{ props }">
            <VIcon v-bind="props" size="18" class="ml-1 grey--text">
              mdi-information-outline
            </VIcon>
          </template>
          {{ listenerSchema.desc || "" }}
        </VTooltip>
      </div>

      <VSwitch
        density="compact"
        :model-value="modelValue.enabled"
        @update:modelValue="toggleEnabled"
      />
    </div>

    <!-- Body -->
    <div v-if="modelValue.enabled" class="pa-3">
      <VRow dense>
        <!-- Action selector -->
        <VCol :cols="3">
          <VSelect
            label="Action"
            density="compact"
            variant="outlined"
            :items="actionOptions"
            :model-value="modelValue.action?.type"
            @update:modelValue="updateAction"
            class="flex-grow-1 tiny-input"
            :error="!!actionSelectorError"
            :error-messages="!!actionSelectorError ? 'Action is required' : ''"
          />
        </VCol>

        <!-- Listener fields -->
        <SchemaForm
          ref="listenerFormRef"
          :schema="listenerSchema.fields"
          :model-value="modelValue.fields"
          @update:modelValue="updateFields"
        />
      </VRow>

      <!-- Action fields -->
      <VRow dense class="mt-3">
        <SchemaForm
          v-if="modelValue.action"
          ref="actionFormRef"
          :schema="ActionRegistry[modelValue.action.type].fields"
          :model-value="modelValue.action.config"
          @update:modelValue="updateActionFields"
        />
      </VRow>
    </div>
  </VCard>
</template>
