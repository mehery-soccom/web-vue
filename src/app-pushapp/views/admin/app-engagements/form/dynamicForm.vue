<script setup>
import { reactive, computed, watch } from 'vue'
import get from 'lodash/get'
import set from 'lodash/set'
import AppTextField from '@/app-pushapp/@core/components/app-form-elements/AppTextField.vue'
import AppTextarea from '@/app-pushapp/@core/components/app-form-elements/AppTextarea.vue'
import AppSelect from '@/app-pushapp/@core/components/app-form-elements/AppSelect.vue'
import MyFileInputUpload from '@/@common/components/vuexy/MyFileInputUpload.vue'
import MyColorPicker from '@/@common/components/vuexy/MyColorPicker.vue'
import MyAddButton from '@/@common/components/vuexy/MyAddButton.vue'
import MyMultipleFilesUpload from '@/@common/components/vuexy/MyMultipleFilesUpload.vue'
import MySelectExtended from '@/@common/components/vuexy/MySelectExtended.vue'
import { usePushNotification } from "@app-pushapp/views/admin/push-notification/usePushNotification";

const { FONT_SIZES, GRADIENT_DIRS, TEMPLATE_ALIGN, TEMPLATES_CONFIG } = usePushNotification();

// Props & emits
const props = defineProps({
  formData: { type: Object, required: true },
  fields: { type: Array, required: true },
})

const emit = defineEmits(['update:formData'])

// Local data mirror
const local = reactive(JSON.parse(JSON.stringify(props.formData)))
let isUpdating = false;
const lineOpen = reactive({ 1: false, 2: false, 3: false });
function toggleLine(line) {
    lineOpen[line] = !lineOpen[line];
}
const extendedVisible = reactive({})

// Sync back on change
watch(() => props.formData, newVal => {
  if (!isUpdating) {
    isUpdating = true
    Object.assign(local, JSON.parse(JSON.stringify(newVal)));
    nextTick(() => isUpdating = false)
  }
  // console.log("props hap", JSON.parse(JSON.stringify(local)));
}, { deep: true, immediate: true });
watch(local, () => {
  // console.log("emit hap", JSON.parse(JSON.stringify(local)));
  if (!isUpdating) {
    isUpdating = true
    emit('update:formData', JSON.parse(JSON.stringify(local)))
    nextTick(() => isUpdating = false)
  }
}, { deep: true })


// Validation
function validate() {
  const errors = []
  props.fields.forEach(f => {
    if (f.rules?.includes('required') && !get(local, f.path)) {
      errors.push(`${f.label} is required`)
    }
    if (f.type === 'extendedSelect' && f.children && get(local, f.path)) {
      f.children.forEach(child => {
        if (child.required && !get(local, child.path)) {
          errors.push(`${child.label} is required`)
        }
      })
    }
  })
  return { valid: errors.length === 0, errors }
}

defineExpose({ validate });
</script>

<template>
  <!-- <div>
    <div v-for="f in fields" :key="f.path" class="mb-4"> -->
  <v-row dense>
    <v-col v-for="f in fields" :key="f.path" :cols="f.cols || 12" class="mb-4">
      <AppTextField
        v-if="f.type === 'text'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label" :placeholder="f.placeholder"
      />
      <AppTextarea
        v-if="f.type === 'textarea'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label" :placeholder="f.placeholder"
      />
      <AppSelect
        v-if="f.type === 'select'"
        :value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :items="f.optionsPath || []"
        :label="f.label" :placeholder="f.placeholder"
        item-title="label"
        item-value="value"
        return-object
      />
      <MyFileInputUpload
        v-if="f.type === 'file'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label"
      />
      <MyColorPicker
        v-if="f.type === 'color'"
        :model-value="get(local, f.path) || ''"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label" :placeholder="f.placeholder"
      />
      <MySelectExtended
        v-if="f.type === 'extendedSelect'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :items="f.optionsPath || []"
        :label="f.label"
        :placeholder="f.placeholder"
        :formData="local"
        @updateChild="({ key, val }) => set(local, key, val)"
      />
      <MyAddButton
        v-if="f.type === 'addButton'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label"
        :placeholder="f.placeholder"
        :max="f.max"
      />
      <MyMultipleFilesUpload
        v-if="f.type === 'addFiles'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label"
        :placeholder="f.placeholder"
        :max="f.max"
      />
      <div v-if="f.type === 'textinputstyle'" class="mb-4">
        <VRow no-gutters align="end">
          <VCol cols="11">
            <AppTextSuggestion
              :model-value="get(local, f.path)"
              @update:modelValue="val => set(local, f.path, val)"
              :label="f.label"
              :placeholder="f.placeholder"
              :suggestions="get(local, 'model.' + f.textinputstylesKey)"
            />
          </VCol>
          <VCol cols="1" class="d-flex align-center justify-end">
            <VBtn icon variant="text" @click="toggleLine(f.line)">
              <VIcon>{{ lineOpen[f.line] ? 'mdi-chevron-up' : 'mdi-pencil' }}</VIcon>
            </VBtn>
          </VCol>
        </VRow>
        <v-row class="mt-2" dense v-show="lineOpen[f.line]">
            <v-col cols="4">
                <AppSelect
                    :value="get(local, f.fontSizeKey)"
                    @update:modelValue="val => set(local, f.fontSizeKey, val)"
                    :items="FONT_SIZES"
                    placeholder="Font Size"
                />
            </v-col>
            <v-col cols="4">
                <MyColorPicker
                    :model-value="get(local, f.fontColorKey) || ''"
                    @update:modelValue="val => set(local, f.fontColorKey, val)"
                    placeholder="Font Color"
                />
            </v-col>
            <v-col cols="4">
                <VBtnToggle
                    :model-value="get(local, f.textStylesKey)"
                    @update:modelValue="val => set(local, f.textStylesKey, val)"
                    multiple outlined>
                    <VBtn value="bold" icon><VIcon>mdi-format-bold</VIcon></VBtn>
                    <VBtn value="italic" icon><VIcon>mdi-format-italic</VIcon></VBtn>
                    <VBtn value="underline" icon><VIcon>mdi-format-underline</VIcon></VBtn>
                </VBtnToggle>
            </v-col>
        </v-row>
      </div>
    </v-col>
  </v-row>
    <!-- </div>
  </div> -->
</template>
