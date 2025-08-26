<script setup>
import { ref, watch } from 'vue'
import AppTextSuggestion from '@/app-pushapp/@core/components/app-form-elements/AppTextSuggestion.vue'
import AppSelect from '@/app-pushapp/@core/components/app-form-elements/AppSelect.vue'
import MyColorPicker from './MyColorPicker.vue'
import { VRow, VCol, VBtn, VIcon, VBtnToggle } from 'vuetify/components'

defineOptions({ name: 'MyTextInputStyle', inheritAttrs: false })

// Props
const props = defineProps({
  modelValue: String,
  label: String,
  placeholder: String,
  rules: { type: Array, default: () => [] },
  fontSize: [String, Number],
  fontColor: String,
  textStyles: Array,
  fontSizesList: { type: Array, default: () => [] },
  iconsList: { type: Array, default: () => [] },
  icon: { type: [String, Number, Boolean], default: null },
  iconPlacement: { type: String, default: null },
  suggestions: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'update:modelValue',
  'update:fontSize',
  'update:fontColor',
  'update:textStyles',
  'update:icon',
  'update:iconPlacement'
])

// Local expand/collapse
const open = ref(false)

// Sync watch (if you want internal state you can extend)
watch(() => props.modelValue, (val) => {
  // do nothing, direct binding via v-model
})
</script>

<template>
  <div class="my-textinput-style">
    <VRow no-gutters align="end">
      <VCol cols="11">
        <AppTextSuggestion
          :model-value="modelValue"
          @update:modelValue="val => emit('update:modelValue', val)"
          :label="label"
          :placeholder="placeholder"
          :rules="rules"
          :suggestions="suggestions"
        />
      </VCol>
      <VCol cols="1" class="d-flex align-center justify-end">
        <VBtn icon variant="text" @click="open = !open">
          <VIcon>{{ open ? 'mdi-chevron-up' : 'mdi-pencil' }}</VIcon>
        </VBtn>
      </VCol>
    </VRow>

    <VRow v-show="open" class="mt-2" dense>
      <VCol :cols="!iconPlacement ? 4 : 2">
        <AppSelect
          :model-value="fontSize"
          @update:modelValue="val => emit('update:fontSize', val)"
          :items="fontSizesList"
          placeholder="Font Size"
        />
      </VCol>
      <VCol :cols="!iconPlacement ? 4 : 3">
        <MyColorPicker
          :model-value="fontColor || ''"
          @update:modelValue="val => emit('update:fontColor', val)"
          placeholder="Font Color"
        />
      </VCol>
      <VCol :cols="!iconPlacement ? 4 : 3">
        <VBtnToggle
          :model-value="textStyles"
          @update:modelValue="val => emit('update:textStyles', val)"
          multiple
          outlined
        >
          <VBtn value="bold" icon><VIcon>mdi-format-bold</VIcon></VBtn>
          <VBtn value="italic" icon><VIcon>mdi-format-italic</VIcon></VBtn>
          <VBtn value="underline" icon><VIcon>mdi-format-underline</VIcon></VBtn>
        </VBtnToggle>
      </VCol>
      <VCol cols="2" v-if="icon !== null">
        <AppSelect
          :model-value="icon"
          @update:modelValue="val => emit('update:icon', val)"
          :items="iconsList"
          placeholder="Icon Size"
        />
      </VCol>
      <VCol cols="2" v-if="iconPlacement !== null">
        <AppSelect
          :model-value="iconPlacement"
          @update:modelValue="val => emit('update:iconPlacement', val)"
          :items="['append','prepend']"
          placeholder="Icon Placement"
        />
      </VCol>
    </VRow>
  </div>
</template>
