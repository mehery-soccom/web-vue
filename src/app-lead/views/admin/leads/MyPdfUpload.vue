<script setup>
import { ref, computed, watch, inject } from 'vue';
import { useDocStore } from '@/app-lead/views/admin/leads/useDocStore';

const { show } = inject("snackbar");
const docStore = useDocStore();

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
  label: {
    type: String,
    default: 'Upload PDF',
  },
  maxSize: {
    type: Number,
    default: 20 * 1024 * 1024, // 20 MB default
  },
  existingUuid: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue", "upload-complete"]);

const uploading = ref(false);
const fileInput = ref(null);

const fileUrl = ref(props.modelValue);
const displayName = ref(props.modelValue ? props.modelValue.split('/').pop().split('?')[0] : null);

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  } else {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    show({ message: 'Only PDF files are allowed.', color: 'error' });
    fileInput.value = null;
    return;
  }
  
  if (props.maxSize && file.size > props.maxSize) {
    show({
      message: `File size exceeds ${formatSize(props.maxSize)} limit.`,
      color: "error",
    });
    fileInput.value = null;
    return;
  }

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file); 

    const response = await docStore.uploadPofileDocument({
      formData: formData,
      existingUuid: props.existingUuid
    });

    const payload = response.results ? response.results[0] : response;
    
    if (!payload.url) {
        throw new Error("Upload response did not include a URL.");
    }

    fileUrl.value = payload.url;
    emit("update:modelValue", payload.url);
    emit("upload-complete", payload);
    displayName.value = payload.name || payload.url.split('/').pop().split('?')[0];
    show({ message: "File uploaded successfully!", color: "success" });

  } catch (error) {
    console.error("handleFileUpload", error);
    show({
      message: "Failed to upload file. Please try again.",
      color: "error",
    });
    fileUrl.value = null;
    emit("update:modelValue", null);
  } finally {
    uploading.value = false;
    fileInput.value = null;
  }
};

function clearUpload() {
  fileUrl.value = null;
  displayName.value = null;
  emit("update:modelValue", null);
}

watch(() => props.modelValue, (newVal) => {
  if (newVal !== fileUrl.value) {
    fileUrl.value = newVal;
    displayName.value = newVal ? newVal.split('/').pop().split('?')[0] : null;
  }
});
</script>

<template>
  <VRow no-gutters align="end">
    <VCol v-if="fileUrl" cols="11">
      <VLabel class="mb-1 text-body-2 text-high-emphasis" :text="label" />
      <VTextField
        :model-value="displayName"
        variant="outlined"
        class="flex-grow-1"
        prepend-inner-icon="mdi-file-pdf-box"
        readonly
      />
    </VCol>

    <VCol v-else cols="12">
      <VLabel class="mb-1 text-body-2 text-high-emphasis" :text="label" />
      <VFileInput
        :loading="uploading"
        color="primary"
        variant="outlined"
        accept="application/pdf"
        @change="handleFileUpload"
        v-model="fileInput"
        placeholder="Select or drop a PDF file"
        prepend-inner-icon="mdi-file-pdf-box"
        prepend-icon=""
      >
        <template #selection="{ fileNames }">
          <template v-for="fileName in fileNames" :key="fileName">
            <VChip
              size="small"
              label
              color="primary"
              class="me-2"
            >
              {{ fileName }}
            </VChip>
          </template>
        </template>
      </VFileInput>
    </VCol>

    <VCol v-if="fileUrl" cols="1" class="d-flex align-center justify-end">
      <VBtn icon variant="text" @click="clearUpload">
        <VIcon>mdi-trash</VIcon>
      </VBtn>
    </VCol>
  </VRow>
</template>

