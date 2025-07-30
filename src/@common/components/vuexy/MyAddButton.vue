<!-- <script setup>
import { ref, watch } from 'vue'
import AppTextField from '@/app-pushapp/@core/components/app-form-elements/AppTextField.vue' 

const props = defineProps({
  modelValue: Array,
  label: String,
  placeholder: String,
  max: Number,
})

const emit = defineEmits(['update:modelValue'])

const emptyButton = () => ({ label: '', value: '', desc: '' })

const local = ref([])

let isSyncing = false

watch(() => props.modelValue, newVal => {
  if (!isSyncing) {
    isSyncing = true
    const filled = newVal?.slice(0, props.max) || []
    local.value = Array.from({ length: props.max }, (_, i) => ({
      label: filled[i]?.label ?? '',
      value: filled[i]?.value ?? '',
      desc: filled[i]?.desc ?? ''
    }))
    isSyncing = false
  }
})

watch(local, newVal => {
  if (!isSyncing) {
    isSyncing = true
    emit('update:modelValue', newVal)
    isSyncing = false
  }
}, { deep: true })

</script>

<template>
  <div>
    <div v-for="(btn, i) in local" :key="i" class="d-flex mb-3 flex-column gap-2">
      <AppTextField v-model="btn.label" label="Label" placeholder="Enter label" />
      <AppTextField v-model="btn.value" label="Value" placeholder="Enter value" />
      <AppTextField v-model="btn.desc" label="Description" placeholder="Enter description" />
      <v-divider v-if="i < props.max - 1" />
    </div>
  </div>
</template> -->
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

// const local = ref([])

// // Sync local with modelValue (only once or when modelValue changes from outside)
// watch(
//   () => props.modelValue,
//   (newVal) => {
//     const filled = newVal || []
//     const padded = Array.from({ length: props.max }, (_, i) => ({
//       label: filled[i]?.label ?? '',
//       value: filled[i]?.value ?? '',
//       desc: filled[i]?.desc ?? ''
//     }))
//     local.value = padded
//   },
//   { immediate: true, deep: false }
// )

// // Emit updated local when any field changes
// function updateField(index, field, value) {
//   local.value[index][field] = value
//   emit('update:modelValue', local.value.map(b => ({ ...b }))) // shallow clone to avoid reactive sync loop
// }
const local = ref([])
const visibleCount = ref(1) // Start with 1 visible block
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

function updateField(index, field, value) {
  local.value[index][field] = value
}
</script>

<template>
  <div>
    <div v-for="(btn, i) in local" :key="i" class="d-flex mb-6 flex-column gap-2">
      <div>Button > {{ i+1 }}</div>
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
      <!-- <v-divider v-if="i < props.max - 1" /> -->
    </div>
    <div v-if="visibleCount < props.max">
      <v-btn variant="tonal" color="primary" @click="addButton">+ Add Button</v-btn>
    </div>
  </div>
</template>