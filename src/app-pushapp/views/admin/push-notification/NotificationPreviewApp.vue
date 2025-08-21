<script setup>
import { computed, ref } from "vue";
import { usePushNotification } from "@app-pushapp/views/admin/push-notification/usePushNotification";
import PopUpPreview from "./previews/PopUpPreview.vue";
import PopOverPreview from "./previews/PopOverPreview.vue";
import PopPipPreview from "./previews/PopPipPreview.vue";
import BottomSheetPreview from "./previews/BottomSheetPreview.vue";

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
  loadNotification();
});

onUnmounted(() => {
  clearInterval(intervalId.value);
});

const loadNotification = () => {
  showNotification.value = false;
  setTimeout(() => (showNotification.value = true), 100);
};

const PopupPreviewRef = ref(null);
const PopoverPreviewRef = ref(null);
const PoppipPreviewRef = ref(null);
const BottomsheetPreviewRef = ref(null)
defineExpose({ PopupPreviewRef, PopoverPreviewRef, PoppipPreviewRef, BottomsheetPreviewRef });
</script>

<template>
  <div :class="['phone-frame-app', template.view.platform]">
    <!-- Background -->
    <div :class="[template.view.platform + '-wallpaper']"></div>
    <div class="ios-white-background"></div>

    <!-- Notch and Top Bar -->
    <div v-if="template.view.platform === 'ios'" class="notch-app"></div>

    <transition name="fade-slide">
      <PopUpPreview
        v-if="template.type === 'pop-up'"
        :template="template"
        ref="PopupPreviewRef"
      />
    </transition>
    <transition name="fade-slide">
      <PopOverPreview
        v-if="template.type === 'pop-over'"
        :template="template"
        ref="PopoverPreviewRef"
      />
    </transition>
    <transition name="fade-slide">
      <PopPipPreview
        v-if="template.type === 'pop-pip'"
        :template="template"
        ref="PoppipPreviewRef"
      />
    </transition>
    <transition name="fade-slide">
      <BottomSheetPreview
        v-if="template.type === 'bottom-sheet'"
        :template="template"
        ref="BottomsheetPreviewRef"
      />
    </transition>
  </div>
</template>

<style lang="scss">
.phone-frame-app {
  width: 360px;
  // height: 618px;
  border: 10px solid #bbb;
  border-radius: clamp(12px, 12%, 40px);
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

.notch-app {
  width: clamp(130px, 60%, 200px);
  height: 24px;
  background-color: #bbb;
  border-radius: 0 0 18px 18px;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
}

.android-notch-app {
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
