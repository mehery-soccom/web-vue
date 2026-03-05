<script setup>
import { ref, computed, watch, inject } from 'vue';
import { useDocStore } from '@/app-lead/views/admin/leads/useDocStore';

// const { show } = inject("snackbar");
const docStore = useDocStore();

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
  label: {
    type: String,
    default: null,
  },
  maxSize: {
    type: Number,
    default: 5 * 1024 * 1024,
  },
  existingUuid: {
    type: String,
    default: null,
  },
  formId: {
    type: String,
    required: true, 
  },
  subDir: {
    type: String,
    default: 'main',
  },
  accept: {
    type: String,
    default: 'application/pdf',
  },
  hint: {
    type: String,
    default: null
  }
});

const emit = defineEmits(["update:modelValue", "upload-complete"]);

const uploading = ref(false);
const fileInput = ref(null);

const fileUrl = ref(props.modelValue);
const displayName = ref(props.modelValue ? props.modelValue.split('/').pop().split('?')[0] : null);
const formattedMaxSize = computed(() => formatSize(props.maxSize));

const showSnackbar = inject("snackbar", null);

const show = (options) => {
  if (showSnackbar && typeof showSnackbar.show === 'function') {
    showSnackbar.show(options);
  } else if (typeof showSnackbar === 'function') {
    showSnackbar(options);
  } else {
    console.warn("Snackbar not available:", options.message);
  }
};

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

  const isImage = props.accept.includes('image/*');
  if (isImage && !file.type.startsWith('image/')) {
    show({ message: 'Only image files are allowed.', color: 'error' });
    fileInput.value = null;
    return;
  } else if (!isImage && props.accept === 'application/pdf' && file.type !== 'application/pdf') {
    show({ message: 'Only PDF files are allowed.', color: 'error' });
    fileInput.value = null;
    return;
  }
  
  if (props.maxSize && file.size > props.maxSize) {
    show({ message: `File size exceeds ${formatSize(props.maxSize)} limit.`, color: "error" });
    fileInput.value = null;
    return;
  }

  if (!props.formId) {
    show({ message: 'Form ID is missing. Cannot upload.', color: "error" });
    fileInput.value = null;
    return;
  }

  uploading.value = true;
  try {
    const formData = new FormData();
    
    formData.append("file", file); 
    formData.append("module", 'lead');
    formData.append("dir", 'forms');
    formData.append("dir_id", props.formId);
    formData.append("sub_dir", props.subDir);

    if (props.existingUuid) {
        formData.append("uuId", props.existingUuid);
        formData.append("uploadType", "update");
    } else {
        formData.append("uploadType", "insert");
    }

    const response = await docStore.uploadModuleDocument({
      formData: formData
    });

    let payload = null;
    if (response.results && response.results.length > 0) {
      payload = response.results[0];
    } else if (response.result) {
      payload = response.result;
    } else {
      payload = response;
    }

    if (!payload || !payload.url) {
      throw new Error("Upload response did not include a valid URL.");
    }

    const filteredPayload = {
      name: payload.name,
      path: payload.path,
      url: payload.url,
      contentType: payload.contentType,
      contentLength: payload.contentLength,
      title: payload.title,
    };

    fileUrl.value = filteredPayload.url;
    emit("update:modelValue", filteredPayload.url);
    emit("upload-complete", filteredPayload); 

    displayName.value = filteredPayload.name || filteredPayload.url.split('/').pop().split('?')[0];
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
    <VCol v-if="fileUrl" cols="12">
      <VLabel v-if="label" class="mb-1 text-body-2 text-high-emphasis" :text="label" />
      <VTextField
        :model-value="displayName"
        variant="outlined"
        class="flex-grow-1"
        :prepend-inner-icon="accept.includes('image') ? 'mdi-image' : 'mdi-file-pdf-box'"
        readonly
      >
        <template #append-inner>
          <div class="d-flex">
            <VBtn
              icon
              variant="text"
              :href="fileUrl"
              target="_blank"
              rel="noopener noreferrer"
              @click.stop
            >
              <VIcon>mdi-eye</VIcon>
            </VBtn>

            <VBtn 
              icon 
              variant="text" 
              color="error"
            >
              <VIcon>mdi-trash</VIcon>
              
              <VDialog activator="parent" max-width="400">
                <template v-slot:default="{ isActive }">
                  <VCard title="Confirm Deletion">
                    <VCardText>
                      Are you sure you want to remove this file?
                    </VCardText>
                    
                    <VCardActions>
                      <VSpacer />
                      <VBtn 
                        text="Cancel" 
                        variant="text" 
                        @click="isActive.value = false" 
                      />
                      <VBtn
                        color="error"
                        variant="elevated"
                        text="Delete"
                        @click="() => { clearUpload(); isActive.value = false; }"
                      />
                    </VCardActions>
                  </VCard>
                </template>
              </VDialog>
              </VBtn>
          </div>
        </template>
      </VTextField>
    </VCol>

    <VCol v-else cols="12">
       <VLabel v-if="label" class="mb-1 text-body-2 text-high-emphasis" :text="label" />
       <VFileInput
        :loading="uploading"
        color="primary"
        variant="outlined"
        :accept="accept"
        @change="handleFileUpload"
        v-model="fileInput"
        :placeholder="accept.includes('image') ? 'Select or drop an image' : 'Select or drop a PDF file'"
        :prepend-inner-icon="accept.includes('image') ? 'mdi-image' : 'mdi-file-pdf-box'"
        prepend-icon=""
        :hint="hint || `Max file size: ${formattedMaxSize}`" persistent-hint
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
  </VRow>
</template>