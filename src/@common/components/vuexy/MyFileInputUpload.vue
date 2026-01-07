<script setup>
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
const { show } = inject("snackbar");

const pushNotificationStore = usePushNotificationStore();

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    default: "",
  },
  label: {
    type: String,
  },
  rules: {
    type: Array,
  },
  maxSize: {
    type: Number,
    default: null,
  },
  enableThumbnail: {
    type: Boolean,
    default: false,
  },
  helperText: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue","update:thumbnailUrl"]);

/**
 * useAttrs() -  To forward unknown props and listeners
 * usage : v-bind="attrs"
 * Does Not Include :
 * 1. Props declared via defineProps() (you access those directly).
 * 2. Emits declared via defineEmits() (those are meant to be handled with emit()).
 */
const attrs = useAttrs();

/**
 * usage : v-bind="_props"
 */
const _props = computed(() => {
  const { modelValue, label, ...rest } = props;

  const __props = { ...rest };

  // console.log("__props", __props);
  return __props;
});

/**
 * usage : v-on="_listeners"
 */
const _listeners = computed(() => {
  const __listeners = Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key.startsWith("on"))
  );

  // console.log("__listeners", __listeners);
  return __listeners;
});

const uploading = ref(false);
const file = ref(null);
const url = ref(props.modelValue);

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  } else {
    return `${(bytes / 1024 / 1024)} MB`;
  }
}
const thumbnails = ref([]);
const selectedThumbnail = ref(null);
const thumbnailLocked = ref(false);
async function generateVideoThumbnails(videoUrl, count = 5) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const thumbs = [];

    video.addEventListener("loadedmetadata", async () => {
      const duration = video.duration;
      if (!duration || isNaN(duration)) return reject("Invalid duration");

      const intervals = Array.from({ length: count }, (_, i) => (duration / (count + 1)) * (i + 1));

      for (const time of intervals) {
        await new Promise((resolveSeek) => {
          video.currentTime = time;
          video.onseeked = () => {
            canvas.width = video.videoWidth / 4;
            canvas.height = video.videoHeight / 4;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL("image/jpeg"));
            resolveSeek();
          };
        });
      }

      resolve(thumbs);
    });

    video.onerror = (err) => reject(err);
  });
}

const handleFileUpload = async (event) => {
  document.activeElement?.blur();
  try {
    const file = event.target.files[0];
    if (!file) return;

    if (props.maxSize && file.size > props.maxSize) {
      show({
        message: `File size exceeds ${formatSize(props.maxSize)} limit.`,
        color: "error",
      });
      return;
    }
    uploading.value = true;
    const formData = new FormData();
    formData.append("docs", file);
    let res = await pushNotificationStore.uploadDoc(formData);
    url.value = res.data.remoteDetails.Location;

    if (file.type.startsWith("video/") && props.enableThumbnail) {
      const localUrl = URL.createObjectURL(file);
      thumbnails.value = await generateVideoThumbnails(localUrl);
    } else {
      thumbnails.value = [];
    }
  } catch (error) {
    console.error("handleFileUpload", error);
    show({
      message: "Failed to upload image. Please try again.",
      color: "error",
    });
  } finally {
    uploading.value = false;
    file.value = null;
  }
};
async function handleThumbnailSelect(thumb) {
  if (thumbnailLocked.value) return;

  selectedThumbnail.value = thumb;
  thumbnailLocked.value = true;
  try {
    const blob = await (await fetch(thumb)).blob();
    const formData = new FormData();
    formData.append("docs", blob, "thumbnail.jpg");
    const res = await pushNotificationStore.uploadDoc(formData);

    show({ message: "Thumbnail uploaded successfully!", color: "success" });
    emit("update:thumbnailUrl", res.data.remoteDetails.Location);
  } catch (error) {
    console.error("Thumbnail upload failed", error);
    show({ message: "Failed to upload thumbnail.", color: "error" });
  }
}

function clearUpload() {
  url.value = "";
  selectedThumbnail.value = "";
}

watch(
  () => props.modelValue,
  (val) => {
    if (val !== url.value) url.value = val;
  }
);
watch(
  () => props.thumbnailUrl,
  (val) => {
    if (val && val !== selectedThumbnail.value) selectedThumbnail.value = val;
  }
);

watch(url, (val) => {
  emit("update:modelValue", val);
});
</script>

<template>
  <VRow no-gutters align="end">
    <VCol :cols="!url ? '12' : '11'">
      <VLabel class="mb-1 text-body-2 text-high-emphasis" :text="label" />
      <VFileInput
        v-if="!url"
        :loading="uploading"
        color="primary"
        variant="outlined"
        accept="video/*,image/*"
        @change="handleFileUpload"
        v-model="file"
        placeholder="Select a file"
        prepend-inner-icon="mdi-image"
        prepend-icon=""
        v-bind="_props"
      />
      <div v-else class="d-flex align-center ga-3">
        <VTextField
          v-model="url"
          variant="outlined"
          class="flex-grow-1"
          prepend-inner-icon="mdi-image"
          readonly
        />
      </div>
      <div v-if="helperText" class="file-helper-text">
        {{ helperText }}
      </div>
    </VCol>
    <VCol v-if="url" cols="1" class="d-flex align-center justify-end">
      <VBtn icon variant="text" @click="clearUpload">
        <VIcon>mdi-trash</VIcon>
      </VBtn>
    </VCol>
  </VRow>
  <div v-if="thumbnails.length" class="d-flex flex-wrap ga-2 mt-3">
    <div
      v-for="(thumb, index) in thumbnails"
      :key="index"
      class="thumb-wrapper"
      :class="{ selected: selectedThumbnail === thumb, disabled: thumbnailLocked }"
      @click="handleThumbnailSelect(thumb)"
    >
      <img :src="thumb" class="thumb" />
      <div v-if="selectedThumbnail === thumb" class="checkmark">
        <VIcon style="margin-top: -14px;" size="12" color="white">mdi-check-circle</VIcon>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.thumb-wrapper {
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
  width: 90px;
  height: 120px;

  .thumb-wrapper.disabled {
    pointer-events: none;
    opacity: 0.6;
    transform: none !important;
  }
  &:hover {
    transform: scale(1.5);
    z-index: 2;
  }
  &.selected {
    border-color: #1976d2;
  }

  .thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .checkmark {
    position: absolute;
    top: 5px;
    right: 5px;
    background: rgba(25, 118, 210, 0.8);
    border-radius: 50%;
    max-height: 17px;
    padding: 2px;
  }
}
.file-helper-text {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}
</style>
