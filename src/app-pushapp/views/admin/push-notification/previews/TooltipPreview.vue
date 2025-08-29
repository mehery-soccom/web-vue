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

const scale = ref(1);
const wrapperRef = ref(null);

function updateScale() {
  if (!wrapperRef.value) return;
  const width = wrapperRef.value.offsetWidth;
  scale.value = width > 270 ? 1 : width / 350;
}

onMounted(()=>{
  updateScale();
  window.addEventListener("resize", updateScale);
})
onBeforeUnmount(() => {
  window.removeEventListener("resize", updateScale);
});
</script>

<template>
  <transition name="fade-slide">
    <div class="preview-wrapper pop-up-dimensions" ref="wrapperRef">
      <div 
        class="tooltip-block"
        :style="{
          width: template.style.width + '%',
          left: '20px',
          bottom: '62%',
          background: backgroundStyle
        }"
      >
        <div class="tooltip-content">
          <div class="line1 road"
            :style="{
              color: template.style.line1_font_color,
              fontSize: (template.style.line1_font_size * scale) + 'px',
              fontWeight: template.style.line1_text_styles?.includes('bold') ? 'bold' : 'normal',
              fontStyle: template.style.line1_text_styles?.includes('italic') ? 'italic' : 'normal',
              textDecoration: template.style.line1_text_styles?.includes('underline') ? 'underline' : 'none',
            }"
          >
            <span v-if="template.style.line1_icon && template.style.line1_icon_position === 'prepend'" v-html="template.style.line1_icon" />
            {{ _bind(props.template.style.line_1) }}
            <span v-if="template.style.line1_icon && template.style.line1_icon_position === 'append'" v-html="template.style.line1_icon" />
          </div>
          <div class="line2 road"
            :style="{
              color: template.style.line2_font_color,
              fontSize: (template.style.line2_font_size * scale) + 'px',
              fontWeight: template.style.line2_text_styles?.includes('bold') ? 'bold' : 'normal',
              fontStyle: template.style.line2_text_styles?.includes('italic') ? 'italic' : 'normal',
              textDecoration: template.style.line2_text_styles?.includes('underline') ? 'underline' : 'none',
            }"
          >
            {{ _bind(props.template.style.line_2) }}
          </div>
        </div>
        <div class="tooltip-arrow"></div>
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
.pop-up-dimensions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  /* max-width: 380px; */
  aspect-ratio: 9 / 16;
  background-image: url("@app-pushapp/assets/images/icons/previews/tooltipbg.png");
  background-size: cover;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.tooltip-block {
  position: absolute;
  background: white;
  border-radius: 10px;
  padding: 6px 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  text-align: left;
  max-width: 90%;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-arrow {
  position: absolute;
  bottom: -8px;
  left: 30px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.road.line1, .road.line2{
  color: black;
}
</style>