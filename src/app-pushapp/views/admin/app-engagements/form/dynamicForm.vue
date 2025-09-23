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
import MyTextInputStyle from '@/@common/components/vuexy/MyTextInputStyle.vue'
import { usePushNotification } from "@app-pushapp/views/admin/push-notification/usePushNotification";
import { useMetaStore } from "@/app-pushapp/views/common/useMetaStore";
import { useAppEngagementsStore } from '../useAppEngagementsStore'
import { ICONS_LIST, FONT_SIZES, GRADIENT_DIRS, GRADIENT_DIRS_2, TEMPLATE_ALIGN, TEMPLATES_CONFIG } from '../data/subTypes'

const AppEngagementsStore = useAppEngagementsStore()
const fromMetaStore = useMetaStore();
const swatch = ref([]);
// Props & emits
const props = defineProps({
  formData: { type: Object, required: true },
  fields: { type: Array, required: true },
})

const emit = defineEmits(['update:formData'])

// Local data mirror
const local = reactive(JSON.parse(JSON.stringify(props.formData)))
let isUpdating = false;
const required = (v) => !!v || "This field is required";
const placeholders = ref([]);

watch(() => get(local, 'style.placeholder_id'), 
  (newVal) => {
    if (!newVal) return;
    const selected = placeholders.value.find(p => p.code === newVal);
    if (selected) {
      local.style.height = selected.height;
      local.style.width = selected.width;
      emit('update:formData', JSON.parse(JSON.stringify(local)));
    }
    console.log("abc", selected, placeholders.value)
  }
);
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
    const isRequired = f.required || f.rules?.includes('required');
    if (isRequired && !get(local, f.path)) {
      errors.push(`${f.label} is required`)
    }
  })
  console.log("called after", props.formData, props.fields, errors)
  return { valid: errors.length === 0, errors }
}
onMounted(async () => {
  const saved = fromMetaStore?.$state?.meta?.prefs?.pa_app_colorlist_saved;
  if (Array.isArray(saved)) swatch.value = saved.map(c => [c.value]);
  const res = await AppEngagementsStore.fetchPlaceholders()
  placeholders.value = res.data.results;
  // console.log("ress", res.data.results, placeholders, placeholders.value)
})

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
        :label="f.label" :placeholder="f.placeholder" :rules="f.required ? [required] : []"
      />
      <AppTextarea
        v-if="f.type === 'textarea'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label" :placeholder="f.placeholder" :rules="f.required ? [required] : []"
      />
      <AppSelect
        v-if="f.type === 'select'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :items="f.optionsPath || []" :clearable="f.clearable"
        :label="f.label" :placeholder="f.placeholder" :rules="f.required ? [required] : []"
        item-title="title"
        item-value="value"
      />
      <AppSelect
        v-if="f.type === 'selectPlaceholder'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :items="placeholders || []"
        :label="f.label" :placeholder="f.placeholder" :rules="f.required ? [required] : []"
        item-title="label"
        item-value="code"
      />
      <MyFileInputUpload
        v-if="f.type === 'file'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :rules="f.required ? [required] : []"
        :label="f.label"
      />
      <MyColorPicker
        v-if="f.type === 'color'"
        :model-value="get(local, f.path) || '#000001'"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label" :placeholder="f.placeholder" 
        :showSwatch="f.showSwatch" :swatches="swatch"
      />
      <MySelectExtended
        v-if="f.type === 'extendedSelect'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :items="f.optionsPath || []"
        :label="f.label"
        :placeholder="f.placeholder"
        :rules="f.required ? [required] : []"
        :formData="local"
        @updateChild="({ key, val }) => set(local, key, val)"
      />
      <MyAddButton
        v-if="f.type === 'addButton'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :style-data="local.style"
        :label="f.label" :swatches="swatch"
        :rules="f.required ? [required] : []"
        :placeholder="f.placeholder"
        :max="f.max" :button-size="f.buttonSize"
      />
      <MyMultipleFilesUpload
        v-if="f.type === 'addFiles'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :label="f.label"
        :placeholder="f.placeholder"
        :rules="f.required ? [required] : []"
        :max="f.max"
      />
      <MyTextInputStyle
        v-if="f.type === 'textinputstyle'"
        :model-value="get(local, f.path)"
        @update:modelValue="val => set(local, f.path, val)"
        :font-size="get(local, f.fontSizeKey)"
        @update:fontSize="val => set(local, f.fontSizeKey, val)"
        :font-color="get(local, f.fontColorKey)"
        @update:fontColor="val => set(local, f.fontColorKey, val)"
        :text-styles="get(local, f.textStylesKey)"
        @update:textStyles="val => set(local, f.textStylesKey, val)"
        :icon-placement="get(local, f.iconPlacement)"
        @update:icon-placement="val => set(local, f.iconPlacement, val)"
        :icon="get(local, f.iconKey)"
        @update:icon="val => set(local, f.iconKey, val)"
        :font-sizes-list="FONT_SIZES"
        :icons-list="ICONS_LIST"
        :label="f.label" :swatches="swatch"
        :placeholder="f.placeholder"
        :rules="f.required ? [required] : []"
        :suggestions="get(local, 'model.' + f.textinputstylesKey)"
      />
    </v-col>
  </v-row>
</template>
