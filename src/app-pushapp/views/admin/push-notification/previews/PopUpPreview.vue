<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  template: { type: Object, required: true },
});

function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function _bind(template) {
  const data = props.template?.model || {};
  return template.replace(/{{\s*([\w]+)\.([\w$.]+)\s*}}/g, (_, prefix, path) => {
    const fullPath = `${prefix}.${path}`;
    const value = getValueByPath(data, fullPath);
    return value !== undefined && value !== '' ? value : `{{${fullPath}}}`;
  });
}

const currentSlide = ref(0);
const imageUrls = computed(() => props.template.style.image_urls || []);
const videoUrls = computed(() => props.template.style.video_urls || []);

const activeMedia = computed(() => {
  if (imageUrls.value.length) return { type: 'image', items: imageUrls.value };
  if (videoUrls.value.length) return { type: 'video', items: videoUrls.value };
  return { type: null, items: [] };
});

watch(
  () => activeMedia.value.items.length,
  (newLength) => {
    if (currentSlide.value >= newLength) currentSlide.value = 0;
  }
);
const backgroundStyle = computed(() => {
  let r = props.template.style.bg_color;
  if (props.template.style.bg_color_gradient) {
    r = `linear-gradient(${props.template.style.bg_color_gradient_dir}, ${props.template.style.bg_color}, ${props.template.style.bg_color_gradient})`;
  }
  return r;
});

const hasMedia = computed(() =>
  props.template.style.image_url ||
  props.template.style.video_url ||
  (activeMedia.value?.items?.length || 0) > 0
);
let interval = null;
const mediaCarouselRef = ref(null);
const setVideoEndListener = async () => {
  await nextTick();
  const videos = mediaCarouselRef.value?.querySelectorAll('video') || [];
  videos.forEach((video, index) => {
    video.onended = null; 
    if (index === currentSlide.value) {
      video.currentTime = 0;
      video.play?.();
      video.onended = () => {
        currentSlide.value = (currentSlide.value + 1) % activeMedia.value.items.length;
      };
    }
  });
};
watch(currentSlide, () => {
  if (activeMedia.value.type === 'video') {
    setVideoEndListener();
  }
});

const scale = ref(1);
const wrapperRef = ref(null);

function updateScale() {
  if (!wrapperRef.value) return;
  const width = wrapperRef.value.offsetWidth;
  scale.value = width > 270 ? 1 : width / 350;
}

onMounted(()=>{
  if (activeMedia.value.type === 'image') {
    interval = setInterval(() => {
      currentSlide.value = (currentSlide.value + 1) % activeMedia.value.items.length;
    }, 3000);
  } else if (activeMedia.value.type === 'video') {
    setVideoEndListener();
  }
  updateScale();
  window.addEventListener("resize", updateScale);
})
onBeforeUnmount(() => {
  clearInterval(interval);
  window.removeEventListener("resize", updateScale);
});
</script>

<template>
  <transition name="fade-slide">
    <div
      class="preview-wrapper pop-up-dimensions" ref="wrapperRef"
      :style="{
        background: backgroundStyle,
        direction: props.template.style.align === 'right' ? 'rtl' : 'ltr',
      }"
    >
      <div class="close-btn">&times;</div>
      <div class="pop-up-vertical-content">
        <div class="text-block-road"
            :style="{
                width: (props.template.style?.width || 100) + '%',
                height: (props.template.style?.height || 100) + '%',
            }">
          <!-- Text -->
          <!-- <div class="line1 ellipsis road" :style="{ color: props.template.style.line1_font_color }">
            {{ _bind(props.template.style.line_1) || "Your title comes here" }}
          </div> -->
          <div v-if="!hasMedia" class="text-flex-wrapper"
            :style="{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: props.template.style?.vertical_align || 'flex-start',
            flex: 1 }"
          >
            <div class="line1 ellipsis road" :style="{
                color: template.style.line1_font_color,
                fontSize: (template.style.line1_font_size * scale) + 'px',
                fontWeight: template.style.line1_text_styles?.includes('bold')
                  ? 'bold'
                  : 'normal',
                fontStyle: template.style.line1_text_styles?.includes('italic')
                  ? 'italic'
                  : 'normal',
                textDecoration: template.style.line1_text_styles?.includes(
                  'underline'
                )
                  ? 'underline'
                  : 'none',
              }">
            {{ _bind(props.template.style.line_1) }}
            </div>
            <div class="line2 ellipsis road" :style="{
                color: template.style.line2_font_color,
                fontSize: (template.style.line2_font_size * scale) + 'px',
                fontWeight: template.style.line2_text_styles?.includes('bold')
                  ? 'bold'
                  : 'normal',
                fontStyle: template.style.line2_text_styles?.includes('italic')
                  ? 'italic'
                  : 'normal',
                textDecoration: template.style.line2_text_styles?.includes(
                  'underline'
                )
                  ? 'underline'
                  : 'none',
              }">
            {{ _bind(props.template.style.line_2) }}
            </div>
            <div class="line3 ellipsis road" :style="{
                color: template.style.line3_font_color,
                fontSize: (template.style.line3_font_size * scale) + 'px',
                fontWeight: template.style.line3_text_styles?.includes('bold')
                  ? 'bold'
                  : 'normal',
                fontStyle: template.style.line3_text_styles?.includes('italic')
                  ? 'italic'
                  : 'normal',
                textDecoration: template.style.line3_text_styles?.includes(
                  'underline'
                )
                  ? 'underline'
                  : 'none',
              }">
            {{ _bind(props.template.style.line_3) }}
            </div>
          </div>

          <div v-else class="line1 ellipsis road" :style="{
                color: template.style.line1_font_color,
                fontSize: (template.style.line1_font_size * scale) + 'px',
                fontWeight: template.style.line1_text_styles?.includes('bold')
                  ? 'bold'
                  : 'normal',
                fontStyle: template.style.line1_text_styles?.includes('italic')
                  ? 'italic'
                  : 'normal',
                textDecoration: template.style.line1_text_styles?.includes(
                  'underline'
                )
                  ? 'underline'
                  : 'none',
              }">
            {{ _bind(props.template.style.line_1) }}
          </div>

          <!-- Media (image/video) -->
          <div class="media-preview" v-if="props.template.style.image_url || props.template.style.video_url">
            <img v-if="props.template.style.image_url" :src="props.template.style.image_url" class="media-item" />
            <video v-else :src="props.template.style.video_url" class="media-item" autoplay muted playsinline webkit-playsinline loop preload="auto" />
          </div>

          <!-- Carousel -->
          <div class="media-preview" v-if="activeMedia.items.length">
            <div class="carousel-wrapper">
                <div class="media-carousel" ref="mediaCarouselRef">
                <template v-for="(item, index) in activeMedia.items" :key="item.value + index">
                    <img
                    v-if="activeMedia.type === 'image'"
                    :src="item.value"
                    class="media-item"
                    :style="{ display: index === currentSlide ? 'block' : 'none' }"
                    />
                    <video
                    v-else
                    :src="item.value"
                    class="media-item"
                    autoplay
                    muted
                    playsinline
                    :style="{ display: index === currentSlide ? 'block' : 'none' }"
                    />
                </template>
                </div>
            </div>
          </div>

          <!-- Carousel Dots -->
          <div class="carousel-dots" v-if="activeMedia.items.length">
            <div
              v-for="(item, index) in activeMedia.items"
              :key="index"
              class="dot"
              tabindex="0"
              :class="{ active: index === currentSlide }"
              @click="currentSlide = index"
              @touchstart="currentSlide = index"
            />
          </div>

          <!-- More Text -->
          <template v-if="hasMedia">
            <div class="line2 ellipsis road" :style="{
                color: template.style.line2_font_color,
                fontSize: (template.style.line2_font_size * scale) + 'px',
                fontWeight: template.style.line2_text_styles?.includes('bold')
                  ? 'bold'
                  : 'normal',
                fontStyle: template.style.line2_text_styles?.includes('italic')
                  ? 'italic'
                  : 'normal',
                textDecoration: template.style.line2_text_styles?.includes(
                  'underline'
                )
                  ? 'underline'
                  : 'none',
              }">{{ _bind(props.template.style.line_2) }}</div>
            <div class="line3 ellipsis road" :style="{
                color: template.style.line3_font_color,
                fontSize: (template.style.line3_font_size * scale) + 'px',
                fontWeight: template.style.line3_text_styles?.includes('bold')
                  ? 'bold'
                  : 'normal',
                fontStyle: template.style.line3_text_styles?.includes('italic')
                  ? 'italic'
                  : 'normal',
                textDecoration: template.style.line3_text_styles?.includes(
                  'underline'
                )
                  ? 'underline'
                  : 'none',
              }">{{ _bind(props.template.style.line_3) }}</div>
          </template>

          <!-- CTA Buttons -->
          <div class="cta-button-group" v-if="props.template.style?.btn?.length">
            <button
              v-for="(btn, i) in props.template.style.btn"
              :key="i" @click="handleClick('INAPP_CTA', props.template.style.btn.value)"
              class="cta-button"
              :style="{
                fontSize: (12 * scale) + 'px',
                padding: (6 * scale) + 'px ' + (8 * scale) + 'px',
                backgroundColor: props.template.style[`button${i + 1}_bg_color`] || 'rgba(25,25,25,0.6)',
                color: props.template.style[`button${i + 1}_font_color`] || 'white',
              }"
            >
              {{ btn.label }}
            </button>
          </div>
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
.line1, .line2, .line3 {
  margin-bottom: 2px;
}
.ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pop-up-dimensions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  /* max-width: 380px; */
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

.pop-up-vertical-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 16px;
  width: 100%;
  height: 100%;
  gap: 10px;
  flex: 1;
  text-align: center;
  overflow-y: auto;
}
.text-block-road {
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 14px;
}
.road.line1, .road.line2, .road.line3 {
  margin: 6px 0;
  color: black;
}
.road.line1{
  margin: 20px 0 10px 0;
  color: black;
}
.media-preview {
  width: 100%;
  aspect-ratio: 3 / 4;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
  background-color: #000;
}

.media-preview .media-item {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
video::-webkit-media-controls { 
    display: none !important; 
}

.cta-button-group {
  display: flex;
  flex-direction: row;
  gap: 10px;
  width: 100%;
  margin-top: auto;
}

.cta-button {
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
}
.carousel-wrapper {
  width: 100%;
  aspect-ratio: 3 / 4;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}
.media-carousel {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #888;
  opacity: 0.5;
  transition: all 0.3s ease;
  cursor: pointer;
}

.dot.active {
  background-color: rgb(59, 58, 58);
  opacity: 1;
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
</style>