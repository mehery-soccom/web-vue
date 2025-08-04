<script setup>
import { computed } from "vue";
import { usePushNotification } from "@app-pushapp/views/admin/push-notification/usePushNotification";
import PopUpPreview from "./previews/PopUpPreview.vue";

const props = defineProps({
  template: {
    type: Object,
    default: {},
  },
});

const showNotification = ref(false);
const currentTime = ref("");
const currentDate = ref("");
const intervalId = ref(null);
const { TEMPLATES_CONFIG } = usePushNotification();
const templateConfig = computed(() => {
  let r =
    TEMPLATES_CONFIG[props.template.type][
      props.template.subType || "default"
    ] || {};
  return r;
});
const backgroundStyle = computed(() => {
  let r = props.template.style.bg_color;
  if (props.template.style.bg_color_gradient) {
    r = `linear-gradient(${props.template.style.bg_color_gradient_dir}, ${props.template.style.bg_color}, ${props.template.style.bg_color_gradient})`;
  }
  return r;
});

onMounted(() => {
  initClock();
  loadNotification();
});

onUnmounted(() => {
  clearInterval(intervalId.value);
});

const initClock = () => {
  updateClock();
  intervalId.value = setInterval(updateClock, 30000);
};

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  currentDate.value = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const loadNotification = () => {
  showNotification.value = false;
  setTimeout(() => (showNotification.value = true), 100);
};
const currentSlide = ref(0)

const imageUrls = computed(() => props.template.style.image_urls || [])
const videoUrls = computed(() => props.template.style.video_urls || [])

const activeMedia = computed(() => {
  if (imageUrls.value.length) {
    return { type: 'image', items: imageUrls.value }
  } else if (videoUrls.value.length) {
    return { type: 'video', items: videoUrls.value }
  }
  return { type: null, items: [] }
})
watch(
  () => activeMedia.value.items.length,
  (newLength) => {
    if (currentSlide.value >= newLength) {
      currentSlide.value = 0;
    }
  }
);
function getValueByPath(obj, path) {
  // console.log("obj", obj, path)
  return path
    .split(".")
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      obj
    );
}

function _bind(template) {
  const data = props.template?.model || {};
  return template.replace(
    /{{\s*([\w]+)\.([\w$.]+)\s*}}/g,
    (_, prefix, path) => {
      const fullPath = `${prefix}.${path}`;
      const value = getValueByPath(data, fullPath);
      return value !== undefined && value !== "" ? value : `{{${fullPath}}}`;
    }
  );
}
const popupPreviewRef = ref(null)

// watch(
//   props.template.view,
//   () => {
//     loadNotification();
//   },
//   { deep: true }
// );
defineExpose({ popupPreviewRef });
</script>

<template>
  <div :class="['phone-frame', template.view.platform]">
    <!-- Background -->
    <div :class="[template.view.platform + '-wallpaper']"></div>
    <div v-if="template.view.platform === 'ios' && template.type === 'pop-up'" class="ios-white-background"></div>

    <!-- Notch and Top Bar -->
    <div v-if="template.view.platform === 'ios'" class="notch"></div>
    <div v-if="template.view.platform === 'ios' && template.type !== 'pop-up'" class="ios-status-bar">
      <span class="carrier">Jio</span>
      <div class="status-icons">
        <span class="icon">📶</span>
        <span class="icon">📡</span>
        <span class="icon">🔋</span>
      </div>
    </div>

    <!-- Pixel-style Android status bar with camera notch -->
    <div
      v-if="template.view.platform === 'android'"
      class="android-notch"
    ></div>
    <div v-if="template.view.platform === 'android'" class="android-status-bar">
      <div class="left-icons">
        <span class="icon">📶</span>
        <span class="icon">📡</span>
      </div>
      <div class="right-icons">
        <span class="icon">🔋</span>
        <span class="icon">🔔</span>
      </div>
    </div>

    <!-- Clock and Date -->
    <div :class="[template.view.platform + '-clock-block']" v-if="template.type !== 'pop-up'">
      <div class="date">{{ currentDate }}</div>
      <div class="clock">{{ currentTime }}</div>
    </div>

    <!-- Notification Preview -->
    <transition name="fade-slide">
      <div
        v-if="showNotification && template.type === 'simple'"
        :class="['notification-preview', template.view.platform]"
      >
        <div :class="[template.view.platform + '-content']">
          <div class="notification-header">
            <img
              v-if="template.style.logo_url || templateConfig.logo_url"
              :src="template.style.logo_url || templateConfig.logo_url"
              class="notification-image"
              alt="logo"
            />
            <div class="notification-text">
              <div class="notification-title-time">
                <div class="title">
                  {{
                    (
                      _bind(template.style.title) || "Your title comes here"
                    ).slice(0, 40)
                  }}{{
                    (_bind(template.style.title) || "").length > 40 ? "..." : ""
                  }}
                </div>
                <div class="notification-time">now</div>
              </div>
              <div class="notification-message-previ">
                <div
                  class="message"
                  :style="
                    template.view.mode === 'collapse' ? 'max-width:205px' : ''
                  "
                >
                  {{
                    (
                      _bind(template.style.message) || "Your message comes here"
                    ).slice(0, 90)
                  }}{{
                    (_bind(template.style.message) || "").length > 90
                      ? "..."
                      : ""
                  }}
                </div>

                <div class="notification-previ">
                  <img
                    v-if="
                      template.style.image_url &&
                      template.view.mode === 'collapse'
                    "
                    class="notification-previ-image"
                    :src="template.style.image_url"
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Long preview -->
          <div v-if="template.view.mode === 'expand'" class="long-preview mt-4">
            <img
              v-if="template.style.image_url"
              :src="template.style.image_url"
              alt=""
            />
          </div>

          <!-- Expanded content for Android -->
          <div
            v-if="
              ((template.view.platform === 'ios' &&
                template.view.mode === 'expand') ||
                template.view.platform === 'android') &&
              template.options.buttons.length
            "
            class="expanded-content"
          >
            <div class="expanded-actions">
              <button
                v-for="item in template.options.buttons"
                :key="item.text"
                class="cta-button"
              >
                {{ item.text }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade-slide">
      <div
        v-if="showNotification && template.type === 'styled'"
        class="preview-wrapper"
        :style="{
          background: backgroundStyle,
          direction: template.style.align === 'right' ? 'rtl' : 'ltr',
        }"
      >
        <div class="content">
          <div
            class="text-block"
            :style="{
              textAlign: template.style.align === 'right' ? 'right' : 'left',
            }"
          >
            <div
              class="line1 ellipsis"
              :style="{
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
              }"
            >
              {{ _bind(template.style.line_1) || "Your title comes here" }}
            </div>
            <div
              class="line2 ellipsis"
              :style="{
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
              }"
            >
              {{ _bind(template.style.line_2) || "Your text comes here" }}
            </div>
            <div
              class="line3 ellipsis"
              :style="{
                color: template.style.line3_font_color,
                fontSize: template.style.line3_font_size + 'px',
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
              }"
            >
              {{ _bind(template.style.line_3) || "Your message comes here" }}
            </div>
            <v-progress-linear
              :color="template.style.progress_color"
              height="4"
              class="mt-2"
              :model-value="40"
              rounded
              background-color="#ccc"
            />
          </div>
          <img
            v-if="template.style.image_url || templateConfig.image_url"
            :src="template.style.image_url || templateConfig.image_url"
            alt=""
            class="notification-image"
          />
        </div>
      </div>
    </transition>
    <transition name="fade-slide">
      <PopUpPreview
        v-if="template.type === 'pop-up'"
        :template="template"
        ref="popupPreviewRef"
      />
        <!-- <div v-if="showNotification && template.type === 'pop-up'" ref="popupPreviewRef"
          class="preview-wrapper pop-up-dimensions"
          :style="{
            background: backgroundStyle,
            direction: template.style.align === 'right' ? 'rtl' : 'ltr',
          }"
        >
          <div class="pop-up-vertical-content">
            <div class="text-block-road">
              <div
                class="line1 ellipsis road"
                :style="{
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
                }"
              >
                {{ _bind(props.template.style.line_1) || "Your title comes here" }}
              </div>
              <div class="media-preview" v-if="template.style.image_url || template.style.video_url">
                <img
                  v-if="template.style.image_url"
                  :src="template.style.image_url"
                  class="media-item"
                  alt="preview"
                />
                <video
                  v-else
                  :src="template.style.video_url"
                  class="media-item"
                  autoplay
                  muted
                  playsinline
                  loop
                ></video>
              </div>
              <div class="media-preview" v-if="activeMedia.items.length && (template.style.image_urls?.length || template.style.video_urls?.length)">
                <div class="carousel-wrapper">
                  <transition-group name="fade" tag="div" class="media-carousel" v-if="activeMedia.items[currentSlide]">
                    <img
                      v-if="activeMedia.type === 'image' && activeMedia.items[currentSlide]"
                      :key="activeMedia.items[currentSlide].value"
                      :src="activeMedia.items[currentSlide].value"
                      class="media-item"
                      alt="carousel-image"
                    />
                    <video
                      v-else-if="activeMedia.type === 'video' && activeMedia.items[currentSlide]"
                      :key="activeMedia.items[currentSlide].value + 'i'"
                      :src="activeMedia.items[currentSlide].value"
                      class="media-item"
                      autoplay
                      muted
                      loop
                      playsinline
                    />
                  </transition-group>
                </div>
              </div>
              <div class="carousel-dots" v-if="activeMedia.items.length && (template.style.image_urls?.length || template.style.video_urls?.length)">
                  <span
                    v-for="(item, index) in activeMedia.items"
                    :key="index"
                    class="dot"
                    :class="{ active: index === currentSlide }"
                    @click="currentSlide = index"
                  ></span>
                </div>
              <div
                class="line2 ellipsis road"
                :style="{
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
                }"
              >
                {{ _bind(template.style.line_2) || "Your text comes here" }}
              </div>
              <div
                class="line3 ellipsis road"
                :style="{
                  color: template.style.line3_font_color,
                  fontSize: template.style.line3_font_size + 'px',
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
                }"
              >
                {{ _bind(template.style.line_3) || "Your message comes here" }}
              </div>
              <div class="cta-button-group" v-if="template.style?.btn?.length">
                <button
                  v-for="(btn, i) in template.style.btn"
                  :key="i"
                  class="cta-button"
                  :style="{
                    backgroundColor: template.style.btn_bg_color || 'rgba(255,255,255,0.1)',
                    color: template.style.btn_font_color || 'white',
                  }"
                >
                  {{ btn.label }}
                </button>
              </div>
            </div>
          </div>
        </div> -->
    </transition>

    <!-- Bottom Icons -->
    <div v-if="template.view.platform === 'ios' && template.type !== 'pop-up'" class="bottom-icons">
      <span class="fingerprint">🔓</span>
      <span class="camera">📷</span>
    </div>
    <!-- <button @click="handleExtractHtml" :disabled="!showNotification" style="z-index: 6;">Get HTML</button> -->
  </div>
</template>

<style lang="scss">
.phone-frame {
  width: 360px;
  // height: 618px;
  border-radius: 42px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  background-color: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ios-wallpaper {
  position: absolute;
  inset: 0;
  background-image: url("@app-pushapp/assets/images/pages/wallpaper_ios_1.png");
  background-size: cover;
  background-position: center;
  z-index: 0;
}

.android-wallpaper {
  position: absolute;
  inset: 0;
  background-image: url("@app-pushapp/assets/images/pages/wallpaper_android_1.png");
  background-size: cover;
  background-position: center;
  z-index: 0;
}
.ios-white-background {
  position: absolute;
  inset: 0;
  background-color: white;
  z-index: 1;
}

.notch {
  width: clamp(130px, 60%, 200px);
  height: 30px;
  background-color: black;
  border-radius: 0 0 18px 18px;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
}

.android-notch {
  width: 20px;
  height: 20px;
  background-color: black;
  border-radius: 10px;
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.carrier {
  width: 55px;
  text-align: center;
}

.ios-status-bar,
.android-status-bar {
  margin-top: 10px;
  z-index: 3;
  color: white;
  width: 100%;
  padding: 0 16px;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .left-icons,
  .right-icons {
    display: flex;
    gap: 15px;
    margin: 0 10px;
  }
}

.status-icons {
  display: flex;
  gap: 8px;
}

.ios-clock-block,
.android-clock-block {
  z-index: 2;
  text-align: center;
  margin-top: 32px;
  color: white;
}

.clock {
  font-size: 56px;
  font-weight: 600;
}

.date {
  font-size: 16px;
  margin-bottom: 4px;
}

.notification-preview {
  z-index: 2;
  border-radius: 18px;
  width: 92%;
  background-color: rgba(30, 30, 30, 0.94);
  color: white;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);

  .notification-header {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .notification-image {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }

  .notification-previ {
    height: 30px;
    // min-width: 30px;
  }

  .notification-previ-image {
    width: 30px;
    height: 30px;
    border-radius: 12px;
  }

  .notification-text {
    flex: 1;
  }

  .notification-title-time {
    display: flex;
    justify-content: space-between;
    align-items: center;
    // margin-bottom: 4px;
  }
  .notification-message-previ {
    display: flex;
    justify-content: space-between;
    align-items: center;
    // margin-bottom: 4px;
  }

  .notification-text .title {
    font-weight: 600;
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 205px;
  }

  .notification-text .message {
    font-size: 13.5px;
    color: #ddd;
    line-height: 1.3;
    display: -webkit-box;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .notification-time {
    font-size: 12px;
    color: #aaa;
    white-space: nowrap;
    width: 30px;
    height: 22.5px;
    text-align: center;
  }

  .expanded-content {
    margin-top: 12px;
  }

  .expanded-actions {
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }

  .cta-button {
    width: 100%;
    padding: 6px 12px;
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }

  .long-preview {
    img {
      width: 100%;
      height: 150px;
    }
  }
}

.bottom-icons {
  position: absolute;
  bottom: 18px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 28px;
  font-size: 20px;
  color: white;
  opacity: 0.85;
  z-index: 1;
}

.fade-slide-enter-active {
  animation: fadeSlide 0.4s ease-out;
}

@keyframes fadeSlide {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

  .content {
    display: flex;
    gap: 12px;
    width: 100%;
  }
  .notification-image {
    width: 30%;
    aspect-ratio: 1;
    border-radius: 8px;
    object-fit: cover;
  }
  .text-block {
    width: 70%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-size: 14px;
  }
  .line1,
  .line2,
  .line3 {
    margin-bottom: 2px;
  }
  .ellipsis {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
