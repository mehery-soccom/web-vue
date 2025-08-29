<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  template: { type: Object, required: true },
});

const isVideo = computed(() => !!props.template.style.video_url);
const backgroundStyle = computed(() => {
  if(!isVideo.value){
    const url = props.template.style.image_url;
    return `url(${url}) center/cover no-repeat`;
  }
});
const isMinimized = ref(true);

const containerStyle = computed(() => ({
  display: "flex",
  justifyContent: props.template.style.horizontal_align,
  alignItems: props.template.style.vertical_align,
  width: "100%",
  height: "100%",
}));

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
};

onMounted(()=>{ })
</script>

<template>
  <transition name="fade-slide">
    <div class="preview-wrapper pop-up-dimensions">
      <div :style="containerStyle">
        <div :style="[{ background: backgroundStyle }]" class="export-content" :class="{ minimized: isMinimized }">
            <video
            v-if="props.template.style.video_url"
            :src="props.template.style.video_url"
            autoplay
            muted
            loop
            playsinline
            style="width: 100%; height: 100%; object-fit: cover;"
            ></video>
            <div v-if="isMinimized" class="close-btn mini" @click="toggleMinimize"><img src="./../../../../assets/images/icons/previews/maximize.png" alt="Max" style="color: white;"></img></div>
            <div v-else class="close-btn">&times;</div>
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
  width: 100%;
  height: 100%;
  position: relative;
}
.export-content.minimized {
  width: 33%;
  height: 33%;
}
video::-webkit-media-controls { 
    display: none !important; 
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  background-color: black;
  color: white;
  border-radius: 50%;
  font-size: 26px;
  line-height: 28px;
  text-align: center;
  z-index: 10;
}
.mini{
  right: 5px;
  top: 5px;
  border-radius: 0%;
}
.close-btn img {
  width: 50%;
  height: 100%;
  object-fit: contain;
  filter: brightness(0) invert(1);
}
</style>