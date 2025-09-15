<script setup>
import { ref, watch, nextTick } from 'vue'
import set from 'lodash/set'
import get from 'lodash/get'
import AppTextField from '@/app-pushapp/@core/components/app-form-elements/AppTextField.vue'
import MyColorPicker from './MyColorPicker.vue'
import AppSelect from '@/app-pushapp/@core/components/app-form-elements/AppSelect.vue'

const props = defineProps({
  modelValue: Array,
  styleData: Object,
  label: String,
  placeholder: String,
  max: Number,
  swatches: Array,
  buttonSize: Boolean,
})

const emit = defineEmits(['update:modelValue', 'update:styleData'])

const local = ref([])
const visibleCount = ref(1) // Starting with 1 visible block
let isSyncing = false
const lineOpen = ref({})

function toggleLine(i) {
  lineOpen.value[i] = !lineOpen.value[i]
}

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
    const index = local.value.length + 1
    local.value.push({ label: '', value: '', desc: '' })
    visibleCount.value++

    set(props.styleData, `button${index}_bg_color`, '#ffffff')
    set(props.styleData, `button${index}_font_color`, '#000000')
    emit('update:styleData', { ...props.styleData })
  }
}
function removeButton(i) {
  local.value.splice(i, 1)
  visibleCount.value--

  const newStyleData = {}
  local.value.forEach((_, idx) => {
    const n = idx + 1
    newStyleData[`button${n}_bg_color`] = get(props.styleData, `button${n}_bg_color`, '#ffffff')
    newStyleData[`button${n}_font_color`] = get(props.styleData, `button${n}_font_color`, '#000000')
  })

  emit('update:styleData', newStyleData)
}

function updateField(index, field, value) {
  local.value[index][field] = value
}

function updateStyle(key, value) {
  set(props.styleData, key, value)
  emit('update:styleData', { ...props.styleData })
}
</script>

<template>
  <div>
    <div v-for="(btn, i) in local" :key="i" :class="['d-flex', 'flex-column', 'gap-2', { 'mb-4': i < local.length - 1 }]">
      <div>
        <div style="display: flex;width: 100%;justify-content: space-between;">
          <div style="display: flex;align-items: center;">Button > {{ i+1 }}</div>
          <div><VBtn icon variant="text" color="error" @click="removeButton(i)"><VIcon>mdi-trash</VIcon></VBtn></div>
        </div>
        <VRow>
          <VCol cols="5.5">
            <AppTextField
              :model-value="btn.label"
              @update:modelValue="val => updateField(i, 'label', val)"
              label="Label"
              placeholder="Enter label"
            />
          </VCol>
          <VCol cols="5.5">
            <AppTextField
              :model-value="btn.value"
              @update:modelValue="val => updateField(i, 'value', val)"
              label="Value"
              placeholder="Enter value"
            />
          </VCol>
          <VCol cols="1" class="d-flex align-center">
            <VBtn icon variant="text" @click="toggleLine(i)">
              <VIcon>{{ lineOpen[i] ? 'mdi-chevron-up' : 'mdi-pencil' }}</VIcon>
            </VBtn>
          </VCol>
        </VRow>
        <VRow v-show="lineOpen[i]" style="margin-top: 0 !important;">
          <v-col :cols="props.buttonSize ? 3 : 4">
            <AppTextField
              :model-value="btn.desc"
              @update:modelValue="val => updateField(i, 'desc', val)"
              label="Description"
              placeholder="Enter description"
            />
          </v-col>
          <v-col v-if="props.buttonSize" cols="3">
            <AppSelect
              :model-value="props.styleData[`button${i + 1}_font_size`]"
              @update:modelValue="val => updateStyle(`button${i + 1}_font_size`, val)"
              label="Button Font Size" item-title="title" item-value="value"
              :items="[
                { title: '14px', value: 14 },
                { title: '12px', value: 12 },
                { title: '10px', value: 10 }
              ]"
            />
          </v-col>
          <v-col :cols="props.buttonSize ? 3 : 4">
              <MyColorPicker
                :model-value="props.styleData[`button${i + 1}_bg_color`]"
                @update:modelValue="val => updateStyle(`button${i + 1}_bg_color`, val)"
                label="Button Background Color" :showSwatch="true" :swatches="props.swatches"
              />
          </v-col>
          <v-col :cols="props.buttonSize ? 3 : 4">
              <MyColorPicker
                :model-value="props.styleData[`button${i + 1}_font_color`]"
                @update:modelValue="val => updateStyle(`button${i + 1}_font_color`, val)"
                label="Button Font Color" :showSwatch="true" :swatches="props.swatches"
              />
          </v-col>
        </VRow>
      </div>
    </div>
    <div v-if="visibleCount < props.max" class="mt-4">
      <v-btn variant="tonal" color="primary" @click="addButton">+ Add Button</v-btn>
    </div>
  </div>
</template>