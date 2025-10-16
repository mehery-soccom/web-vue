<script setup>
import { ref } from "vue";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";

const props = defineProps({
  modelValue: { type: Object, required: true },
});
const emit = defineEmits(["update:modelValue"]);

const formRef = ref();
const showDistribution = ref(false);
const distributionFields = ["platform"];
const distributionValues = {
  platform: [
    { title: "iOS", value: "ios" },
    { title: "Android", value: "android" },
  ],
};

const onSampleSizeInput = (val) => {
  // Clamp the value between 1 and 50
  if (val > 50) props.modelValue.sampleSize = 50;
  else if (val < 0) props.modelValue.sampleSize = null;

  emit("update:modelValue", props.modelValue);
};

const onEvaluationWindowInput = (val) => {
  // Clamp the value between 1 and 60
  if (val > 60) props.modelValue.evaluationWindow = 60;
  else if (val < 0) props.modelValue.evaluationWindow = null;

  emit("update:modelValue", props.modelValue);
};

const isValid = async (silent = false) => {
  let validationResult = await formRef.value.validate();
  return validationResult.valid;
};

defineExpose({ isValid });
</script>

<template>
  <VForm ref="formRef">
    <VRow dense>
      <!-- Sample Size -->
      <VCol cols="12" md="2">
        <AppTextField
          v-model="props.modelValue.sampleSize"
          @input="(e) => onSampleSizeInput(e.target.value)"
          label="Sample Size"
          type="number"
          :min="1"
          :max="50"
          :step="1"
          class="no-number-arrows"
          :rules="[requiredValidator]"
        >
          <template #append-inner>
            <span class="text-body-2 grey--text">%</span>
          </template>
        </AppTextField>
      </VCol>

      <!-- Evaluation Window -->
      <VCol cols="12" md="2">
        <AppTextField
          v-model="props.modelValue.evaluationWindow"
          @input="(e) => onEvaluationWindowInput(e.target.value)"
          label="Evaluation Window"
          type="number"
          :min="1"
          :max="60"
          :step="1"
          class="no-number-arrows"
          :rules="[requiredValidator]"
        >
          <template #append-inner>
            <span class="text-body-2 grey--text mr-1">minutes</span>
            <VTooltip location="top">
              <template #activator="{ props }">
                <VIcon v-bind="props" size="18" class="ml-1 grey--text">
                  mdi-information-outline
                </VIcon>
              </template>
              Message expires if no action is taken within this window
            </VTooltip>
          </template>
        </AppTextField>
      </VCol>
    </VRow>

    <!-- Winner Determination -->
    <VRow dense>
      <VCol cols="12" md="3">
        <AppTextField label="Winner Determination" value="Automatic" readonly>
          <template #append-inner>
            <VTooltip location="top">
              <template #activator="{ props }">
                <VIcon v-bind="props" size="18" class="ml-1 grey--text"
                  >mdi-information-outline</VIcon
                >
              </template>
              After sample size is distributed, the winning template will
              automatically be sent to remaining audience
            </VTooltip>
          </template>
        </AppTextField>
      </VCol>
    </VRow>

    <!-- Optional Distribution Parameter glued fields -->
    <VRow dense>
      <VCol cols="12" md="3" v-if="showDistribution">
        <AppSelect
          v-model="props.modelValue.distributionParameter"
          :items="distributionFields"
          label="Distribution Parameter Field"
        />
      </VCol>
      <VCol
        cols="12"
        md="4"
        v-if="showDistribution && props.modelValue.distributionParameter"
      >
        <AppSelect
          v-model="props.modelValue.distributionParameterValues"
          :items="distributionValues[props.modelValue.distributionParameter]"
          label="Values"
          multiple
          chips
          clearable
          :rules="[requiredValidator]"
        />
      </VCol>
    </VRow>

    <!-- Toggle Distribution Parameter -->
    <VBtn
      variant="tonal"
      color="primary"
      size="small"
      class="mt-4"
      @click="
        showDistribution = !showDistribution;
        if (!showDistribution) {
          props.modelValue.distributionParameter = null;
          props.modelValue.distributionParameterValues = [];

          emit('update:modelValue', props.modelValue);
        }
      "
    >
      <VIcon start>{{ showDistribution ? "mdi-minus" : "mdi-plus" }}</VIcon>
      {{
        showDistribution
          ? "Remove Distribution Parameter"
          : "Add Distribution Parameter"
      }}
    </VBtn>
  </VForm>
</template>

<style scoped>
/* Hide arrows in number inputs */
.no-number-arrows input::-webkit-outer-spin-button,
.no-number-arrows input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.no-number-arrows input[type="number"] {
  -moz-appearance: textfield; /* Firefox */
}
</style>
