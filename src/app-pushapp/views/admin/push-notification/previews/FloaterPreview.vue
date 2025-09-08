<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { toast } from 'vue3-toastify'

const props = defineProps({
  template: { type: Object, required: true },
});

const isVideo = computed(() => !!props.template.style.video_url);
const isMinimized = ref(true);
const mediaSize = ref({ width: 0, height: 0 });
const rejectMedia = ref(false);
const mediaEl = ref(null);

watch(() => [props.template.style.image_url, props.template.style.video_url],
  ([imgUrl, vidUrl]) => {
    const url = imgUrl || vidUrl;
    if (!url) {
      mediaSize.value = { width: 0, height: 0 };
      rejectMedia.value = false;
      return;
    }

    nextTick(() => {
      if (!mediaEl.value) return;
      if (vidUrl) {
        mediaEl.value.onloadedmetadata = () => {
          mediaSize.value = {
            width: mediaEl.value.videoWidth,
            height: mediaEl.value.videoHeight,
          };
          rejectMedia.value = mediaSize.value.width > 120 || mediaSize.value.height > 120;
        };
      } else {
        mediaEl.value.onload = () => {
          mediaSize.value = {
            width: mediaEl.value.naturalWidth,
            height: mediaEl.value.naturalHeight,
          };
          rejectMedia.value = mediaSize.value.width > 120 || mediaSize.value.height > 120;
        };
      }
    });
  },
  { immediate: true }
);
watch(rejectMedia, (val) => {
  if (val) {
    toast.error("File dimensions exceeded 120px.");
  }
});

const blockStyle = computed(() => {
  if (!isMinimized.value) return {};

  return {
    width: "120px",
    height: "120px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    justifyContent: props.template.style.horizontal_align || "center",
    alignItems: props.template.style.vertical_align || "center",
  };
});

const mediaStyle = computed(() => {
  const { width, height } = mediaSize.value;

  if (rejectMedia.value) return { display: "none" };
  if (width === 120 && height === 120) return { width: "120px", height: "120px" };
  if (width < 120 || height < 120) return { width: width + "px", height: height + "px",};
  return { maxWidth: '120px', maxHeight: '120px', objectFit: 'contain' };
});

const containerStyle = computed(() => ({
  display: "flex",
  justifyContent: props.template.style.horizontal_align,
  alignItems: props.template.style.vertical_align,
  width: "100%",
  height: "100%",
}));

</script>

<template>
  <transition name="fade-slide">
    <div class="preview-wrapper pop-up-dimensions">
      <div :style="containerStyle">
        <div :style="[blockStyle]" class="export-content">
          <video
            v-if="props.template.style.video_url"
            :src="props.template.style.video_url"
            autoplay
            muted
            loop
            playsinline
            :style="mediaStyle" ref="mediaEl"
          ></video>
          <img
            v-else-if="props.template.style.image_url"
            :src="props.template.style.image_url"
            :style="mediaStyle" ref="mediaEl"
          />
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.preview-wrapper {
  z-index: 2;
  border-radius: 18px;
  width: 92%;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  background-color: rgba(30, 30, 30, 0.94);
  color: white;
  padding: 14px 16px;
  position: absolute;
  bottom: 80px;
}
.pop-up-dimensions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  aspect-ratio: 9 / 16;
  background-color: rgb(255, 255, 255);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.export-content {
  width: 120px;
  height: 120px;
  margin: 13px;
  position: relative;
}
video::-webkit-media-controls { 
    display: none !important; 
}
</style>