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
  if (style.bg_color_gradient_dir) {
    return `linear-gradient(${style.bg_color_gradient_dir}, ${style.bg_color}, ${style.bg_color_gradient})`;
  }
  return style.bg_color;
});

const hasMedia = computed(() => props.template.style.image_url || props.template.style.video_url );
const scale = ref(1);
const wrapperRef = ref(null);

function updateScale() {
  if (!wrapperRef.value) return;
  const width = wrapperRef.value.offsetWidth;
  scale.value = width > 270 ? 1 : width / 350;
}

onMounted(() => {
  updateScale();
  window.addEventListener("resize", updateScale);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateScale);
});
</script>

<template>
  <transition name="fade-slide">
    <div class="preview-wrapper pop-up-dimensions" ref="wrapperRef">
      <div class="bottomsheet-block" :style="{
        background: backgroundStyle,
        direction: props.template.style.align === 'right' ? 'rtl' : 'ltr',
      }">
        <div class="close-btn">&times;</div>
        <div class="pop-up-vertical-content">
            <div class="text-block-road">
            <div v-if="!hasMedia" class="text-flex-wrapper"
                :style="{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: props.template.style?.vertical_align || 'center',
                flex: 1 }"
            >
                <div class="line1 ellipsisi road" :style="{
                    marginTop: '10px',
                    color: template.style.line1_font_color,
                    fontSize: (template.style.line1_font_size * scale) + 'px',
                    fontWeight: template.style.line1_text_styles?.includes('bold')
                    ? 'bold'
                    : 'normal',
                    fontStyle: template.style.line1_text_styles?.includes('italic')
                    ? 'italic'
                    : 'normal',
                    textDecoration: template.style.line1_text_styles?.includes('underline')
                    ? 'underline'
                    : 'none',
                }">
                {{ _bind(props.template.style.line_1) }}
                </div>
                <div class="line2 ellipsisi road" :style="{
                    color: template.style.line2_font_color,
                    fontSize: (template.style.line2_font_size * scale) + 'px',
                    fontWeight: template.style.line2_text_styles?.includes('bold')
                    ? 'bold'
                    : 'normal',
                    fontStyle: template.style.line2_text_styles?.includes('italic')
                    ? 'italic'
                    : 'normal',
                    textDecoration: template.style.line2_text_styles?.includes('underline')
                    ? 'underline'
                    : 'none',
                }">
                {{ _bind(props.template.style.line_2) }}
                </div>
                <div class="line3 ellipsisi road" :style="{
                    color: template.style.line3_font_color,
                    fontSize: (template.style.line3_font_size * scale) + 'px',
                    fontWeight: template.style.line3_text_styles?.includes('bold')
                    ? 'bold'
                    : 'normal',
                    fontStyle: template.style.line3_text_styles?.includes('italic')
                    ? 'italic'
                    : 'normal',
                    textDecoration: template.style.line3_text_styles?.includes('underline')
                    ? 'underline'
                    : 'none',
                }">
                {{ _bind(props.template.style.line_3) }}
                </div>
            </div>

            <div v-else class="line1 ellipsisi road" :style="{
                    color: template.style.line1_font_color,
                    fontSize: (template.style.line1_font_size * scale) + 'px',
                    fontWeight: template.style.line1_text_styles?.includes('bold')
                    ? 'bold'
                    : 'normal',
                    fontStyle: template.style.line1_text_styles?.includes('italic')
                    ? 'italic'
                    : 'normal',
                    textDecoration: template.style.line1_text_styles?.includes('underline')
                    ? 'underline'
                    : 'none',
                }">
                {{ _bind(props.template.style.line_1) }}
            </div>

            <!-- Media (image/video) -->
            <div class="media-preview" v-if="hasMedia">
                <img v-if="props.template.style.image_url" :src="props.template.style.image_url" class="media-item" 
                    :onclick="props.template.style.notification_url 
                    ? `handleClick('MEDIA_CLICK', '${props.template.style.notification_url}', '${props.template.style.notification_url}')` : null" />
                <video v-else :src="props.template.style.video_url" class="media-item" autoplay muted playsinline webkit-playsinline loop preload="auto" 
                    :onclick="props.template.style.notification_url 
                    ? `handleClick('MEDIA_CLICK', '${props.template.style.notification_url}', '${props.template.style.notification_url}')` : null" />
            </div>

            <!-- More Text -->
            <template v-if="hasMedia">
                <div class="line2 ellipsisi road" :style="{
                    color: template.style.line2_font_color,
                    fontSize: (template.style.line2_font_size * scale) + 'px',
                    fontWeight: template.style.line2_text_styles?.includes('bold')
                    ? 'bold'
                    : 'normal',
                    fontStyle: template.style.line2_text_styles?.includes('italic')
                    ? 'italic'
                    : 'normal',
                    textDecoration: template.style.line2_text_styles?.includes('underline')
                    ? 'underline'
                    : 'none',
                }">{{ _bind(props.template.style.line_2) }}</div>
                <div class="line3 ellipsisi road" :style="{
                    marginTop: !!template.style.line2 ? '0px' : '4px',
                    color: template.style.line3_font_color,
                    fontSize: (template.style.line3_font_size * scale) + 'px',
                    fontWeight: template.style.line3_text_styles?.includes('bold')
                    ? 'bold'
                    : 'normal',
                    fontStyle: template.style.line3_text_styles?.includes('italic')
                    ? 'italic'
                    : 'normal',
                    textDecoration: template.style.line3_text_styles?.includes('underline')
                    ? 'underline'
                    : 'none',
                }">{{ _bind(props.template.style.line_3) }}</div>
            </template>

            <!-- CTA Buttons -->
            <div class="cta-button-group" v-if="props.template.style?.btn?.length">
                <button
                v-for="(btn, i) in props.template.style.btn"
                :key="i" :onclick="`handleClick('INAPP_CTA', '${btn.label}', '${btn.value}')`"
                class="cta-button"
                :style="{
                    fontSize: ((props.template.style[`button${i + 1}_font_size`] || 12) * scale) + 'px',
                    padding: (4 * scale) + 'px ' + (8 * scale) + 'px',
                    backgroundColor: props.template.style[`button${i + 1}_bg_color`] || 'rgba(25,25,25,0.6)',
                    color: props.template.style[`button${i + 1}_font_color`] || 'white',
                }">
                {{ btn.label }}
                </button>
            </div>
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
.ellipsisi {
  display: -webkit-box;
  -webkit-line-clamp: 3;
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
.bottomsheet-block{
  width: 100%;
  height:55%;
  position: absolute;
  bottom: 0;
}

.pop-up-vertical-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 6px 14px 14px 14px;
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
  /* font-size: 14px; */
  height: 100%;
}
.road.line1, .road.line2, .road.line3 {
  margin: 4px 0 2px 0;
  color: black;
  display: flex;
  align-items: center;
  justify-content: center;
}
.media-preview {
  max-height: 100%;
  aspect-ratio: 4 / 3;
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
  margin-top: 2px;
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
.close-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 23px;
  height: 23px;
  background-color: black;
  color: white;
  border-radius: 50%;
  font-size: 22px;
  line-height: 23px;
  text-align: center;
  z-index: 10;
}
</style>