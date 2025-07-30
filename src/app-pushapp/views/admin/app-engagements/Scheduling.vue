<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
});
const emit = defineEmits(["update:modelValue"]);

const form = ref({ ...props.modelValue });

watch(
  () => form.value,
  (val) => emit("update:modelValue", val),
  { deep: true }
);

const errors = ref({});

const clearError = (field) => {
  if (errors.value[field]) delete errors.value[field];
};

const summary = computed(() => ({
  duration:
    form.value.durationType === "paused"
      ? "Campaign will run until it is manually paused."
      : form.value.durationType === "specific"
      ? `Campaign runs from ${form.value.startDate || "?"} to ${
          form.value.endDate || "?"
        }.`
      : form.value.durationType === "days"
      ? `Campaign runs on ${form.value.days || "selected days"}.`
      : "",
  repeat:
    form.value.repeatType === "once"
      ? "Each user will see the campaign only once."
      : form.value.repeatType === "repeat"
      ? `Each user will see the campaign up to ${
          form.value.repeatCount || "?"
        } time(s).`
      : form.value.repeatType === "afterDays"
      ? `Each user will see the campaign again after ${
          form.value.repeatAfterDays || "?"
        } day(s).`
      : "",
  delivery: form.value.ignoreLimit
    ? "Global impression limits will be ignored for this campaign."
    : "Global impression limits will be applied to this campaign.",
}));

const isValid = async (silent = false) => {
  const e = {};

  if (form.value.durationType === "specific") {
    if (!form.value.startDate) e.startDate = "Start date is required";

    if (!form.value.endDate) e.endDate = "End date is required";
  }
  if (form.value.durationType === "days" && !form.value.days) {
    e.days = "Please enter at least one day";
  }
  if (
    form.value.repeatType === "repeat" &&
    (!form.value.repeatCount || form.value.repeatCount < 1)
  ) {
    e.repeatCount = "Enter a valid repeat count";
  }
  if (
    form.value.repeatType === "afterDays" &&
    (!form.value.repeatAfterDays || form.value.repeatAfterDays < 1)
  ) {
    e.repeatAfterDays = "Enter valid days count";
  }

  if (!silent) errors.value = e;
  return Object.keys(e).length === 0;
};

defineExpose({ isValid });
</script>

<template scoped>
  <VCard class="pa-6 scheduling">
    <!-- Summary Section -->
    <template v-if="false">
      <h3 class="mb-2">Summary</h3>
      <ul class="text-caption text-grey-darken-1 pl-4 mb-6">
        <li>{{ summary.duration }}</li>
        <li>{{ summary.repeat }}</li>
        <li>{{ summary.delivery }}</li>
      </ul>

      <VDivider class="mb-6" />
    </template>

    <!-- Campaign Duration -->
    <h3 class="mb-2">Campaign Duration</h3>
    <p class="text-caption mb-4">
      Choose how long the campaign will remain active
    </p>
    <VRadioGroup v-model="form.durationType" hide-details>
      <VRadio value="paused">
        <template #label>
          <span>Till the campaign is paused</span>
        </template>
      </VRadio>

      <VRadio value="specific">
        <template #label>
          <div class="d-flex flex-column gap-2">
            <div class="d-flex flex-wrap align-center gap-2">
              <span>At specific date/time</span>
              <AppDateTimePicker
                :key="form.durationType + errors.startDate"
                v-model="form.startDate"
                placeholder="Select Date"
                class="flex-grow-1 tiny-input"
                style="min-width: 140px"
                :error="!!errors.startDate"
                @update:modelValue="clearError('startDate')"
                :disabled="form.durationType !== 'specific'"
              />
              <span>ending on</span>
              <AppDateTimePicker
                :key="form.durationType + errors.endDate"
                v-model="form.endDate"
                placeholder="Select Date"
                class="flex-grow-1 tiny-input"
                style="min-width: 140px"
                :error="!!errors.endDate"
                @update:modelValue="clearError('endDate')"
                :disabled="form.durationType !== 'specific'"
              />
            </div>
          </div>
        </template>
      </VRadio>
    </VRadioGroup>

    <!-- Repeat Campaign -->
    <template v-if="false">
      <VDivider class="my-6" />
      <h3 class="mb-2">Repeat Campaign</h3>
      <p class="text-caption mb-4">
        Choose how often a user will see this campaign
      </p>
      <VRadioGroup v-model="form.repeatType" hide-details>
        <VRadio value="once">
          <template #label>
            <span>Show campaign to user only once</span>
          </template>
        </VRadio>

        <VRadio value="multiple">
          <template #label>
            <span>Allow user to view campaign repeatedly</span>
          </template>
        </VRadio>

        <VRadio value="repeat">
          <template #label>
            <div class="d-flex flex-wrap align-center gap-2">
              <span>Allow user to view campaign upto</span>
              <VTextField
                v-model="form.repeatCount"
                type="number"
                class="tiny-input"
                style="width: 80px"
                density="compact"
                variant="outlined"
                hide-details
                :error="!!errors.repeatCount"
                :error-messages="errors.repeatCount"
                @update:modelValue="clearError('repeatCount')"
              />
              <span>time(s)</span>
            </div>
          </template>
        </VRadio>

        <VRadio value="afterDays">
          <template #label>
            <div class="d-flex flex-wrap align-center gap-2">
              <span>Allow user to view campaign after</span>
              <VTextField
                v-model="form.repeatAfterDays"
                type="number"
                class="tiny-input"
                style="width: 80px"
                density="compact"
                variant="outlined"
                hide-details
                :error="!!errors.repeatAfterDays"
                :error-messages="errors.repeatAfterDays"
                @update:modelValue="clearError('repeatAfterDays')"
              />
              <span>day(s) after last seen</span>
            </div>
          </template>
        </VRadio>
      </VRadioGroup>
    </template>

    <!-- Delivery Control -->
    <template v-if="false">
      <VDivider class="my-6" />
      <h3 class="mb-2">Delivery Control</h3>
      <p class="text-caption mb-4">
        Choose whether to ignore the global impressions limit for this campaign
      </p>
      <VSwitch
        v-model="form.ignoreLimit"
        label="Ignore campaign impressions limit"
        inset
      />
      <p class="text-caption mt-2 text-red">
        Campaign will not be delivered if global limit has been reached. Current
        global limit: 100 campaigns/week. Go to settings to change.
      </p>
    </template>
  </VCard>
</template>

<style>
.scheduling {
  .tiny-input .v-field__input {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    font-size: 1rem !important;
    min-height: 32px !important; /* instead of ~40px */
  }
  .v-label {
    width: auto !important;
  }
}
</style>
