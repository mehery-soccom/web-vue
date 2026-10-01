<script setup>
import { ref, reactive, watch } from "vue";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";

const props = defineProps({
  config: { type: Object, required: true },
});

const emit = defineEmits(["save", "cancel"]);

const localValue = reactive({});
const localValueInitial = ref({});
const formRef = ref(null);

function parseTimeRanges(val) {
  const list = Array.isArray(val) ? val.slice(0, 2) : [];
  const parsed = list
    .map((item) => {
      const raw = typeof item === "string" ? item : "";
      const [start = "", end = ""] = raw.split(" - ");
      return { start: start.trim().slice(0, 5), end: end.trim().slice(0, 5) };
    })
    .filter((range) => range.start || range.end);

  return parsed.length ? parsed : [{ start: "", end: "" }];
}

function toggleOvernight(field) {
  const ranges = localValue[field.label];
  if (!Array.isArray(ranges)) return;
  if (ranges.length > 1) ranges.splice(1);
  else ranges.push({ start: "", end: "" });
}

function endAfterStart(start) {
  return (end) => {
    if (!start || !end) return true;
    return (
      start.slice(0, 5) < end.slice(0, 5) || "End time must be after start time"
    );
  };
}

watch(
  () => props.config,
  (config) => {
    const val = config?.value;
    const field = config?.fields?.[0];
    if (field?.type === "time-range") {
      localValue[field.label] = parseTimeRanges(val);
    } else if (Array.isArray(val)) {
      localValue[field?.label] = val;
    } else if (typeof val === "object" && val !== null) {
      Object.assign(localValue, val);
    } else {
      localValue[field?.label] = val;
    }
    localValueInitial.value = JSON.stringify(localValue);
  },
  { immediate: true }
);

async function onSave() {
  let validationResult = await formRef.value.validate();
  if (!validationResult.valid) {
    return;
  }

  const field = props.config.fields?.[0];
  let value;
  if (field?.type === "time-range") {
    const ranges = localValue[field.label] || [];
    value = ranges.map((range) => {
      const start = String(range.start || "").slice(0, 5);
      const end = String(range.end || "").slice(0, 5);
      return `${start} - ${end}`;
    });
  } else if (Array.isArray(props.config.value)) {
    value = localValue[field?.label];
  } else if (
    typeof props.config.value === "object" &&
    props.config.value !== null
  ) {
    value = localValue;
  } else {
    value = localValue[field?.label];
  }
  emit("save", value, props.config);
}
</script>

<template>
  <VForm ref="formRef" @submit.prevent="onSave">
    <VRow class="mb-4 align-end">
      <template v-for="(field, idx) in config.fields" :key="idx">
        <!-- Text Input -->
        <VCol v-if="field.type === 'text'" cols="12" md="6">
          <AppTextField
            v-model="localValue[field.label]"
            :label="field.label"
            :rules="[field.required ? requiredValidator : null]"
          />
        </VCol>

        <!-- File Input -->
        <VCol v-else-if="field.type === 'file'" cols="12">
          <MyFileInputUpload
            v-model="localValue[field.label]"
            :label="field.label"
            :rules="[field.required ? requiredValidator : null]"
            accept="image/*"
          />
        </VCol>

        <!-- Color Picker -->
        <VCol v-else-if="field.type === 'color'" cols="12" md="6">
          <MyColorPicker
            v-model="localValue[field.label]"
            :placeholder="field.label"
            :rules="[field.required ? requiredValidator : null]"
          />
        </VCol>

        <!-- Multiple Color Picker -->
        <VCol
          v-else-if="field.type === 'multi-color'"
          cols="12"
          md="6"
          v-for="(color, index) in localValue[field.label]"
          :key="'brand_colour_' + index"
        >
          <VLabel
            class="mb-1 text-body-2 text-high-emphasis"
            :text="field.label + ' > ' + (index + 1)"
          />
          <div class="d-flex align-center">
            <MyColorPicker
              v-model="localValue[field.label][index].value"
              placeholder="Select Color"
              :rules="[field.required ? requiredValidator : null]"
            />
            <VIcon
              color="error"
              class="ml-2"
              icon="mdi-trash"
              @click="() => localValue[field.label].splice(index, 1)"
            />
          </div>
        </VCol>
        <VCol
          v-if="
            field.type === 'multi-color' &&
            localValue[field.label].length < (field.size || 5)
          "
          cols="12"
          md="6"
        >
          <VBtn
            variant="outlined"
            color="primary"
            @click="() => localValue[field.label].push({ value: null })"
          >
            + New Color
          </VBtn>
        </VCol>

        <VCol v-if="field.type === 'time-range'" cols="12">
          <div
            v-for="(range, index) in localValue[field.label]"
            :key="'time_range_' + index"
            class="mb-2"
          >
            <VLabel
              v-if="localValue[field.label].length > 1"
              class="mb-1 text-body-2 text-high-emphasis"
              :text="'Window ' + (index + 1)"
            />
            <VRow>
              <VCol cols="6">
                <AppTextField
                  v-model="range.start"
                  label="From"
                  type="time"
                  :rules="[field.required ? requiredValidator : null]"
                />
              </VCol>
              <VCol cols="6">
                <AppTextField
                  v-model="range.end"
                  label="To"
                  type="time"
                  :rules="[
                    field.required ? requiredValidator : null,
                    endAfterStart(range.start),
                  ]"
                />
              </VCol>
            </VRow>
          </div>
          <VBtn
            type="button"
            class="mt-2"
            :variant="localValue[field.label].length > 1 ? 'tonal' : 'outlined'"
            :color="localValue[field.label].length > 1 ? 'primary' : 'secondary'"
            @click="toggleOvernight(field)"
          >
            Overnight window
          </VBtn>
        </VCol>
      </template>
    </VRow>
    <div class="d-flex justify-space-between mt-4">
      <div></div>
      <div>
        <VBtn color="secondary" text @click="$emit('cancel')">Cancel</VBtn>
        <VBtn
          color="primary"
          class="ml-2"
          type="submit"
          :disabled="JSON.stringify(localValue) === localValueInitial"
          >Save</VBtn
        >
      </div>
    </div>
  </VForm>
</template>
