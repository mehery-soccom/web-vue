<script setup>
const props = defineProps({
  modelValue: {
    type: null,
    default: null,
  },

  label: String,

  mode: {
    type: String,
    default: "button",
    validator: (v) => ["radio", "button"].includes(v),
  },

  options: {
    type: Array,
    default: () => [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
  },

  disabled: Boolean,
  readonly: Boolean,

  error: Boolean,
  errorMessages: {
    type: [String, Array],
    default: "",
  },
  hint: String,
  persistentHint: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const isSelected = (val) => props.modelValue === val;

function updateValue(val) {
  if (props.readonly || props.disabled) return;
  emit("update:modelValue", val);
}
</script>

<template>
  <div>
    <VInput
      :error="error"
      :error-messages="errorMessages"
      :hint="hint"
      :persistent-hint="persistentHint"
      :disabled="disabled"
      density="compact"
      class="w-100"
      hide-details
    >
      <template #default>
        <VField
          :label="label"
          variant="outlined"
          :active="modelValue !== null"
          class="w-100"
        >
          <template #default>
            <!-- RADIO MODE -->
            <div
              v-if="mode === 'radio'"
              class="v-field__input v-input__control"
            >
              <VRadioGroup
                :model-value="modelValue"
                @update:modelValue="updateValue"
                :disabled="disabled || readonly"
                density="compact"
                inline
              >
                <VRadio
                  v-for="opt in options"
                  :key="String(opt.value)"
                  :label="opt.label"
                  :value="opt.value"
                />
              </VRadioGroup>
            </div>
            <!-- BUTTON MODE -->
            <div v-else class="v-field__input v-input__control pa-0">
              <VBtnToggle
                divided
                color="primary"
                mandatory="false"
                :style="'height: auto'"
              >
                <VBtn
                  v-for="opt in options"
                  :key="String(opt.value)"
                  :active="isSelected(opt.value)"
                  :disabled="disabled || readonly"
                  @click="updateValue(opt.value)"
                >
                  {{ opt.label }}
                </VBtn>
              </VBtnToggle>
            </div>
          </template>
        </VField>
      </template>
    </VInput>
  </div>
</template>

<style scoped></style>
