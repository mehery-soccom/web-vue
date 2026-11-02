<script setup>
const props = defineProps({
  page: { type: Object, required: true },
  template: { type: Object, default: () => ({}) },
  markerType: { type: String, default: null },
  selectedId: { type: [String, Array], default: null },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(["select"]);

const screenshot = computed(() => props.page?.screenshot || {});
const rawWidth = computed(() => Number(screenshot.value.image?.width) || 393);
const rawHeight = computed(() => Number(screenshot.value.image?.height) || 852);

// image.width/height are device pixels while markers are in logical screen units (dp/pt),
// so derive the pixel density unless the screenshot provides it.
const DENSITIES = [4, 3.5, 3, 2.75, 2.625, 2.5, 2, 1.5, 1];
const MIN_SCREEN_WIDTH = 320;
const density = computed(() => {
  const s = screenshot.value;
  const explicit = Number(s.density || s.pixelRatio || s.image?.density || s.image?.pixelRatio);
  if (explicit > 0) return explicit;
  const all = s.markers || [];
  const maxX = Math.max(0, ...all.map((m) => Number(m.x) + Number(m.width)));
  const maxY = Math.max(0, ...all.map((m) => Number(m.y) + Number(m.height)));
  return (
    DENSITIES.find((d) => rawWidth.value / d >= MIN_SCREEN_WIDTH && maxX <= rawWidth.value / d && maxY <= rawHeight.value / d) || 1
  );
});
const imageWidth = computed(() => rawWidth.value / density.value);
const imageHeight = computed(() => rawHeight.value / density.value);

const markers = computed(() =>
  (screenshot.value.markers || []).filter((m) => !props.markerType || m.type === props.markerType),
);
const selectedMarker = computed(() => markers.value.find((m) => m.id === props.selectedId));

const style = computed(() => props.template?.style || {});
const isTooltip = computed(() => props.template?.type === "tooltip");
const isInline = computed(() => props.template?.type === "inline");

const canvasRef = ref(null);
const scale = ref(1);
let resizeObserver = null;

const updateScale = () => {
  const width = canvasRef.value?.getBoundingClientRect().width;
  if (width) scale.value = width / imageWidth.value;
};

onMounted(() => {
  nextTick(updateScale);
  resizeObserver = new ResizeObserver(updateScale);
  if (canvasRef.value) resizeObserver.observe(canvasRef.value);
});

onBeforeUnmount(() => resizeObserver?.disconnect());

watch(imageWidth, updateScale);

const getValueByPath = (obj, path) => path.split(".").reduce((acc, key) => acc?.[key], obj);

const _bind = (text) => {
  const data = props.template?.model || {};
  return String(text || "").replace(/{{\s*([\w]+)\.([\w$.]+)\s*}}/g, (_, prefix, path) => {
    const fullPath = `${prefix}.${path}`;
    const value = getValueByPath(data, fullPath);
    return value !== undefined && value !== "" ? value : `{{${fullPath}}}`;
  });
};

const backgroundStyle = computed(() => {
  const s = style.value;
  if (s.bg_image_url) return `url(${s.bg_image_url}) center/cover no-repeat`;
  if (s.bg_color_gradient_dir) return `linear-gradient(${s.bg_color_gradient_dir}, ${s.bg_color}, ${s.bg_color_gradient})`;
  return s.bg_color;
});

const toPx = (value) => `${Number(value) || 0}px`;
// Screenshot units → rendered size via the canvas container width (no JS measurement involved)
const cq = (value) => `calc(${Number(value) || 0} * 100cqw / ${imageWidth.value})`;

const lineStyle = (n, unit = toPx) => {
  const s = style.value;
  const textStyles = s[`line${n}_text_styles`] || [];
  const fontSize = Number(s[`line${n}_font_size`]);
  return {
    color: s[`line${n}_font_color`],
    fontSize: fontSize ? unit(fontSize) : undefined,
    fontWeight: textStyles.includes?.("bold") ? "bold" : "normal",
    fontStyle: textStyles.includes?.("italic") ? "italic" : "normal",
    textDecoration: textStyles.includes?.("underline") ? "underline" : "none",
  };
};

const buttonStyle = (i) => {
  const s = style.value;
  return {
    fontSize: cq(s[`button${i + 1}_font_size`] || 12),
    padding: `${cq(4)} ${cq(8)}`,
    borderRadius: cq(6),
    backgroundColor: s[`button${i + 1}_bg_color`] || "rgba(255,255,255,0.1)",
    color: s[`button${i + 1}_font_color`] || "white",
  };
};

const toPct = (value, total) => `${((Number(value) || 0) / total) * 100}%`;

const markerStyle = (marker) => ({
  left: toPct(marker.x, imageWidth.value),
  top: toPct(marker.y, imageHeight.value),
  width: toPct(marker.width, imageWidth.value),
  height: toPct(marker.height, imageHeight.value),
});

const inlineContentStyle = computed(() => ({
  background: backgroundStyle.value,
  direction: style.value.align === "right" ? "rtl" : "ltr",
  padding: `0 ${cq(12)}`,
  fontSize: cq(14),
}));

const TOOLTIP_GAP = 10;
const SCREEN_PADDING = 8;

const tooltipLayout = computed(() => {
  const marker = selectedMarker.value;
  if (!marker) return null;
  const screenW = imageWidth.value;
  const screenH = imageHeight.value;
  const widthPct = Math.min(Math.max(Number(style.value.width) || 60, 10), 100);
  const bubbleWidth = Math.min((screenW * widthPct) / 100, screenW - SCREEN_PADDING * 2);
  const centerX = marker.x + marker.width / 2;
  const left = Math.min(Math.max(centerX - bubbleWidth / 2, SCREEN_PADDING), screenW - bubbleWidth - SCREEN_PADDING);
  const below = marker.y + marker.height / 2 < screenH / 2;
  const arrowLeft = Math.min(Math.max(centerX - left - 8, 8), bubbleWidth - 24);

  return {
    below,
    bubble: {
      left: toPx(left),
      width: toPx(bubbleWidth),
      ...(below
        ? { top: toPx(marker.y + marker.height + TOOLTIP_GAP) }
        : { bottom: toPx(screenH - marker.y + TOOLTIP_GAP) }),
      background: backgroundStyle.value,
    },
    arrow: {
      left: toPx(arrowLeft),
      [below ? "borderBottomColor" : "borderTopColor"]: style.value.bg_color || "white",
    },
  };
});

const onSelect = (marker) => {
  if (props.readonly) return;
  emit("select", marker.id);
};
</script>

<template>
  <div class="page-marker-frame">
    <div ref="canvasRef" class="page-marker-canvas" :style="{ aspectRatio: `${imageWidth} / ${imageHeight}` }">
      <img
        :src="screenshot.mediaUrl"
        :alt="page.label"
        class="page-marker-image"
        draggable="false"
        @load="updateScale"
      />

        <div
          v-for="marker in markers"
          :key="marker.id"
          role="button"
          :class="[
            'page-marker',
            {
              'page-marker--active': marker.id === selectedId,
              'page-marker--filled': isInline && marker.id === selectedId,
              'page-marker--readonly': readonly,
            },
          ]"
          :style="markerStyle(marker)"
          @click="onSelect(marker)"
        >
          <VTooltip activator="parent" location="top">{{ marker.id }}</VTooltip>

          <div
            v-if="isInline && marker.id === selectedId"
            class="inline-content"
            :style="inlineContentStyle"
          >
            <div :class="['inline-body', { vertical: style.align === 'vertical' }]" :style="{ gap: cq(12) }">
              <div v-if="style.align === 'vertical' && style.image_url" class="inline-text">
                <div class="inline-line ellipsis" :style="lineStyle(1, cq)">{{ _bind(style.line_1) }}</div>
              </div>
              <div v-if="style.image_url" class="inline-image">
                <img :src="style.image_url" alt="" />
              </div>
              <div class="inline-text">
                <div
                  v-if="style.align !== 'vertical' || !style.image_url"
                  class="inline-line ellipsis"
                  :style="lineStyle(1, cq)"
                >
                  {{ _bind(style.line_1) }}
                </div>
                <div class="inline-line ellipsis" :style="lineStyle(2, cq)">{{ _bind(style.line_2) }}</div>
                <div class="inline-line ellipsis" :style="lineStyle(3, cq)">{{ _bind(style.line_3) }}</div>
              </div>
              <div v-if="style.btn?.length" class="inline-buttons" :style="{ gap: cq(6) }">
                <span v-for="(btn, i) in style.btn" :key="i" class="inline-cta" :style="buttonStyle(i)">
                  {{ btn.label }}
                </span>
              </div>
            </div>
          </div>
        </div>

      <div
        v-if="isTooltip && tooltipLayout"
        class="page-marker-stage"
        :style="{ width: `${imageWidth}px`, height: `${imageHeight}px`, transform: `scale(${scale})` }"
      >
        <div class="tooltip-bubble" :style="tooltipLayout.bubble">
          <div class="tooltip-body">
            <div v-if="style.richline_1" class="tooltip-line tooltip-rich" style="display: flex;">
              <span v-if="style.line1_icon && style.line1_icon_position === 'prepend'" v-html="style.line1_icon" />
              <span v-html="_bind(style.richline_1)" />
              <span v-if="style.line1_icon && style.line1_icon_position === 'append'" v-html="style.line1_icon" />
            </div>
            <div v-else class="tooltip-line" :style="lineStyle(1)">
              <span v-if="style.line1_icon && style.line1_icon_position === 'prepend'" v-html="style.line1_icon" />
              {{ _bind(style.line_1) }}
              <span v-if="style.line1_icon && style.line1_icon_position === 'append'" v-html="style.line1_icon" />
            </div>
            <div class="tooltip-line" :style="lineStyle(2)">{{ _bind(style.line_2) }}</div>
          </div>
          <div
            :class="['tooltip-arrow', tooltipLayout.below ? 'tooltip-arrow--up' : 'tooltip-arrow--down']"
            :style="tooltipLayout.arrow"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-marker-frame {
  width: 100%;
  max-width: 360px;
  border: 10px solid #bbb;
  border-radius: 40px;
  overflow: hidden;
  background-color: #000;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}
.page-marker-canvas {
  position: relative;
  width: 100%;
  overflow: hidden;
  container-type: inline-size;
}
.page-marker-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  user-select: none;
}
.page-marker-stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  pointer-events: none;
}
.page-marker {
  position: absolute;
  border: 2px dashed rgb(var(--v-theme-primary));
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.18);
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.page-marker:hover {
  background: rgba(var(--v-theme-primary), 0.32);
}
.page-marker--active {
  border-style: solid;
  background: rgba(var(--v-theme-primary), 0.4);
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.35);
}
.page-marker--filled {
  background: transparent;
  overflow: hidden;
}
.page-marker--readonly {
  cursor: default;
}

/* Inline content rendered inside the selected placeholder */
.inline-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  background-color: #fff;
  pointer-events: none;
}
.inline-body {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.inline-body.vertical {
  flex-direction: column;
  justify-content: flex-start;
}
.inline-image {
  max-width: 25%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.inline-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}
.inline-body.vertical .inline-image {
  max-width: 100%;
  aspect-ratio: 1 / 1;
}
.inline-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.inline-body.vertical .inline-text {
  width: 100%;
  text-align: center;
}
.inline-line {
  margin: 2px 0;
  color: black;
}
.ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inline-buttons {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  max-width: 25%;
}
.inline-body.vertical .inline-buttons {
  flex-direction: row;
  max-width: 100%;
  gap: 12px;
}
.inline-cta {
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

/* Tooltip bubble anchored to the selected tooltip marker */
.tooltip-bubble {
  position: absolute;
  background: white;
  border-radius: 10px;
  padding: 6px 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  text-align: left;
  pointer-events: none;
  z-index: 2;
}
.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tooltip-line {
  margin-bottom: 2px;
  color: black;
}
.tooltip-rich :deep(p) {
  margin: 0 0 4px;
}
.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
}
.tooltip-arrow--up {
  top: -8px;
  border-bottom: 8px solid white;
}
.tooltip-arrow--down {
  bottom: -8px;
  border-top: 8px solid white;
}
</style>
