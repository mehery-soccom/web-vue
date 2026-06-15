<script setup>
import { computed, watch, ref } from 'vue'
import get from 'lodash/get'
import set from 'lodash/set'
import AppSelect from '@/app-pushapp/@core/components/app-form-elements/AppSelect.vue'
import AppTextField from '@/app-pushapp/@core/components/app-form-elements/AppTextField.vue'
import AppTextarea from '@/app-pushapp/@core/components/app-form-elements/AppTextarea.vue'
import AppColorPicker from './MyColorPicker.vue'
import AppFileInput from './MyFileInputUpload.vue'

defineOptions({ name: 'MySelectExtended', inheritAttrs: false })

// Props
const props = defineProps({
  modelValue: Object,
  items: Array,
  label: String,
  placeholder: String,
  children: Array,
  optionsPath: Array,
  formData: Object,
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'updateChild'])

const localValue = ref(props.modelValue)

// Sync with v-model
watch(() => props.modelValue, newVal => {
  localValue.value = newVal
})

function getComponent(type) {
  switch (type) {
    case 'text': return AppTextField
    case 'textarea': return AppTextarea
    case 'color': return AppColorPicker
    case 'file': return AppFileInput
    case 'select': return AppSelect
    default: return AppTextField
  }
}
const localButtons = ref([])
const activeOption = computed(() => {
  return props.items?.find(item => item.value === props.modelValue?.value) || {}
})

watch(
  () => props.modelValue?.value,
  () => {
    if (!activeOption?.value) return
    const option = activeOption.value
    const existingButtons = get(props.formData || {}, 'options.buttons', [])

    localButtons.value = (option.children || []).map((child, i) => {
      const existing = existingButtons[i] || {}
      return {
        button_id: child.id,
        button_text: child.text,
        button_url: existing.button_url || ''
      }
    })
  },
  { immediate: true }
)

function onChildUpdate(index, val) {
  if (!localButtons.value[index]) return
  localButtons.value[index].button_url = val

  emit('updateChild', {
    key: 'options.buttons',
    val: [...localButtons.value] // trigger reactivity
  })
}
</script>

<template>
  <div class="app-extended-select">
    <AppSelect
      :model-value="modelValue"
      @update:modelValue="val => emit('update:modelValue', val)"
      :items="items"
      :label="label"
      :placeholder="placeholder"
      item-title="label"
      item-value="value"
      return-object :disabled="disabled"
    />
    <div v-if="modelValue?.value && activeOption.children?.length">
      <component
        v-for="(child, index) in activeOption.children"
        :key="child.path"
        :is="getComponent(child.type)"
        :model-value="localButtons[index]?.button_url || ''"
        @update:modelValue="val => onChildUpdate(index, val)"
        v-bind="child"
        style="margin: 10px 0;" :disabled="disabled"
      />
    </div>
  </div>
</template>
