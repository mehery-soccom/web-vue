<script setup>
import { ref, watch } from 'vue'
import MyFileInputUpload from '@/@common/components/vuexy/MyFileInputUpload.vue'

const props = defineProps({
  modelValue: Array,
  label: String,
  placeholder: String,
  max: Number,
  maxSize: {
    type: Number,
    default: null
  },
  helperText: {
    type: String,
    default: "",
  },
})

const emit = defineEmits(['update:modelValue', 'update:thumbnailUrl'])

const localFiles = ref([])        // Holds file URLs
const visibleCount = ref(2)       // Initial 2 file inputs

let isSyncing = false

function syncFromModel(newVal = []) {
  isSyncing = true
  //   localFiles.value = Array.from({ length: props.max }, (_, i) => newVal[i] || '')
  const files = newVal.slice(0, props.max).map(f => ({
    value: f?.value || '',
    ...f,
  }))
  while (files.length < Math.min(2, props.max)) {
    files.push({ value: '' })
  }

  localFiles.value = files
  visibleCount.value = Math.min(Math.max(files.length, 2), props.max)
  nextTick(() => isSyncing = false)
}

// Sync from parent
watch(
  () => props.modelValue,
  newVal => {
    if (!isSyncing) syncFromModel(newVal)
  },
  { immediate: true }
)

// Emit to parent
watch(
  localFiles,
  newVal => {
    if (!isSyncing) {
      isSyncing = true
      emit('update:modelValue', newVal.map(obj => ({ ...obj })))
      nextTick(() => isSyncing = false)
    }
  },
  { deep: true }
)

function addFileInput() {
  if (visibleCount.value < props.max) {
    localFiles.value.push({ value: '' })
    visibleCount.value++
  }
}
</script>

<template>
  <div>
    <div v-for="(fileObj, index) in localFiles.slice(0, visibleCount)" :key="index" class="mb-3">
      <MyFileInputUpload v-if="index === 0"
        v-model="fileObj.value" :label="`${props.label || 'File'} ${index + 1}`"
        :placeholder="props.placeholder" :max-size="props.maxSize" 
        :enableThumbnail="true" :thumbnail-url="fileObj.thumbnailUrl" 
        @update:thumbnailUrl="val => {
          fileObj.thumbnailUrl = val;
          emit('update:thumbnailUrl', val)
        }" :helper-text="props.helperText"
      />
      <MyFileInputUpload v-else
        v-model="fileObj.value" :label="`${props.label || 'File'} ${index + 1}`"
        :placeholder="props.placeholder" :max-size="props.maxSize" :helper-text="props.helperText"
      />
      <!-- <MyFileInputUpload
        v-model="fileObj.value"
        :label="`${props.label || 'File'} ${index + 1}`"
        :placeholder="props.placeholder" :max-size="props.maxSize"
      /> -->
    </div>
    <div v-if="visibleCount < props.max">
      <v-btn variant="tonal" color="primary" @click="addFileInput">+ Add File</v-btn>
    </div>
  </div>
</template>