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

watch(
  () => props.config.value,
  (val) => {
    if (Array.isArray(val)) {
      localValue[props.config.fields[0]?.label] = val;
    } else if (typeof val === "object") {
      Object.assign(localValue, val);
    } else {
      localValue[props.config.fields[0]?.label] = val;
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

  let value;
  if (Array.isArray(props.config.value)) {
    value = localValue[props.config.fields[0]?.label];
  } else if (typeof props.config.value === "object") {
    value = localValue;
  } else {
    value = localValue[props.config.fields[0]?.label];
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
