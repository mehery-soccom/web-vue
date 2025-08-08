<script setup>
import { ref, watch, nextTick } from 'vue'
import AppTextField from '@/app-pushapp/@core/components/app-form-elements/AppTextField.vue'

const props = defineProps({
  modelValue: Array,
  label: String,
  placeholder: String,
  max: Number,
})

const emit = defineEmits(['update:modelValue'])

const local = ref([])
const visibleCount = ref(1) // Starting with 1 visible block
let isSyncing = false

function syncFromModel(newVal = []) {
  isSyncing = true
  const buttons = newVal.slice(0, props.max).map(b => ({
    label: b?.label ?? '',
    value: b?.value ?? '',
    desc: b?.desc ?? ''
  }))

  // Ensure at least 1 entry is shown
  while (buttons.length < Math.min(1, props.max)) {
    buttons.push({ label: '', value: '', desc: '' })
  }

  local.value = buttons
  visibleCount.value = Math.min(Math.max(buttons.length, 1), props.max)

  nextTick(() => (isSyncing = false))
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (!isSyncing) syncFromModel(newVal)
  },
  { immediate: true }
)

watch(
  local,
  (newVal) => {
    if (!isSyncing) {
      isSyncing = true
      emit('update:modelValue', newVal.map(b => ({ ...b })))
      nextTick(() => (isSyncing = false))
    }
  },
  { deep: true }
)

function addButton() {
  if (visibleCount.value < props.max) {
    local.value.push({ label: '', value: '', desc: '' })
    visibleCount.value++
  }
}
function removeButton(i) {
  if (i < props.max) {
    local.value.splice(i, 1);
    visibleCount.value--
  }
}

function updateField(index, field, value) {
  local.value[index][field] = value
}
</script>

<template>
  <div>
    <div v-for="(btn, i) in local" :key="i" :class="['d-flex', 'flex-column', 'gap-2', { 'mb-6': i < local.length - 1 }]">
      <div>
        <div style="display: flex;width: 100%;justify-content: space-between;">
          <div style="display: flex;align-items: center;">Button > {{ i+1 }}</div>
          <div><VBtn icon variant="text" color="error" @click="removeButton(i)"><VIcon>mdi-trash</VIcon></VBtn></div>
        </div>
        <AppTextField
          :model-value="btn.label"
          @update:modelValue="val => updateField(i, 'label', val)"
          label="Label"
          placeholder="Enter label"
        />
        <AppTextField
          :model-value="btn.value"
          @update:modelValue="val => updateField(i, 'value', val)"
          label="Value"
          placeholder="Enter value"
        />
        <AppTextField
          :model-value="btn.desc"
          @update:modelValue="val => updateField(i, 'desc', val)"
          label="Description"
          placeholder="Enter description"
        />
      </div>
    </div>
    <div v-if="visibleCount < props.max">
      <v-btn variant="tonal" color="primary" @click="addButton">+ Add Button</v-btn>
    </div>
  </div>
</template>