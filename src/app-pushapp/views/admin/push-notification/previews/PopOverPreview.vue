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
const backgroundStyle = computed(() => {
  const style = props.template.style;
  if (style.bg_image_url) {
    return `url(${style.bg_image_url}) center/cover no-repeat`;
  }
  if (style.bg_color_gradient) {
    return `linear-gradient(${style.bg_color_gradient_dir}, ${style.bg_color}, ${style.bg_color_gradient})`;
  }
  return style.bg_color;
});

onMounted(()=>{})

</script>

<template>
  <transition name="fade-slide">
    <div class="preview-wrapper pop-up-dimensions">
        <div class="close-btn">&times;</div>
        <div class="banner-wrapper" :style="{ background: backgroundStyle, direction: props.template.style.align === 'right' ? 'rtl' : 'ltr' }">
            <div class="banner-content" :style="{ flexDirection: props.template.style.horizontal_align === 'right' ? 'row-reverse' : 'row'}">
            <!-- Image -->
            <div class="banner-image" v-if="props.template.style.image_url">
                <img :src="props.template.style.image_url" class="banner-media-item" />
            </div>

            <!-- Text -->
            <div class="banner-text">
                <div class="line1-ban ellipsis road" :style="{
                color: template.style.line1_font_color,
                fontSize: template.style.line1_font_size + 'px',
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
                fontSize: template.style.line2_font_size + 'px',
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
            </div>

            <!-- Buttons -->
            <div class="banner-buttons" v-if="props.template.style?.btn?.length">
                <button
                v-for="(btn, i) in props.template.style.btn"
                :key="i"
                class="cta-button"
                :style="{
                    backgroundColor: props.template.style[`button${i + 1}_bg_color`] || 'rgba(255,255,255,0.1)',
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
.road.line1, .road.line2, .road.line3, .road.line1-ban {
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

.cta-button {
  padding: 4px 8px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
}
.banner-wrapper {
  width: 100%;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
  padding: 0 12px;
}

.banner-content {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.banner-image {
  flex-shrink: 0;
  max-width: 25%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-media-item {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.banner-buttons {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  max-width: 25%;
}
.close-btn {
  position: absolute;
  top: 34px;
  right: 4px;
  width: 18px;
  height: 18px;
  background-color: black;
  color: white;
  border-radius: 50%;
  font-size: 18px;
  line-height: 18px;
  text-align: center;
  z-index: 10;
}
</style>