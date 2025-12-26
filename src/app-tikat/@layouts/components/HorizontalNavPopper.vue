<script setup>
import { computePosition, flip, shift } from "@floating-ui/dom";
import { useLayouts } from "@app-tikat/@layouts/composable/useLayouts";
import { config } from "@app-tikat/@layouts/config";
import { themeConfig } from "@app-tikat/themeConfig.js";

const props = defineProps({
  popperInlineEnd: {
    type: Boolean,
    required: false,
    default: false,
  },
  tag: {
    type: String,
    required: false,
    default: "div",
  },
  contentContainerTag: {
    type: String,
    required: false,
    default: "div",
  },
  isRtl: {
    type: Boolean,
    required: false,
  },
});

const refPopperContainer = ref();
const refPopper = ref();

const popperContentStyles = ref({
  left: "0px",
  top: "0px",

  // strategy: 'fixed',
});

const updatePopper = async () => {
  const { x, y } = await computePosition(
    refPopperContainer.value,
    refPopper.value,
    {
      placement: props.popperInlineEnd
        ? props.isRtl
          ? "left-start"
          : "right-start"
        : "bottom-start",
      middleware: [
        flip({ boundary: document.querySelector("body") }),
        shift({ boundary: document.querySelector("body") }),
      ],

      // strategy: 'fixed',
    }
  );

  popperContentStyles.value.left = `${x}px`;
  popperContentStyles.value.top = `${y}px`;
};

until(config.horizontalNav.type)
  .toMatch((type) => type === "static")
  .then(() => {
    useEventListener("scroll", updatePopper);

    // strategy: 'fixed',
  });

const isContentShown = ref(false);

const showContent = () => {
  isContentShown.value = true;
  updatePopper();
};

const hideContent = () => {
  isContentShown.value = false;
};

onMounted(updatePopper);

const { isAppRtl, appContentWidth } = useLayouts();

watch([isAppRtl, appContentWidth], updatePopper);

// Watch for route changes and close popper content if route is changed
const route = useRoute();

watch(() => route.fullPath, hideContent);
</script>

<template>
  <div
    class="nav-popper"
    :class="[
      {
        'popper-inline-end': popperInlineEnd,
        'show-content': isContentShown,
      },
    ]"
  >
    <div
      ref="refPopperContainer"
      class="popper-triggerer"
      @mouseenter="showContent"
      @mouseleave="hideContent"
    >
      <slot />
    </div>

    <!-- SECTION Popper Content -->
    <!-- 👉 Without transition -->
    <template v-if="!themeConfig.horizontalNav.transition">
      <div
        ref="refPopper"
        class="popper-content"
        :style="popperContentStyles"
        @mouseenter="showContent"
        @mouseleave="hideContent"
      >
        <div>
          <slot name="content" />
        </div>
      </div>
    </template>

    <!-- 👉 CSS Transition -->
    <template
      v-else-if="typeof themeConfig.horizontalNav.transition === 'string'"
    >
      <Transition :name="themeConfig.horizontalNav.transition">
        <div
          v-show="isContentShown"
          ref="refPopper"
          class="popper-content"
          :style="popperContentStyles"
          @mouseenter="showContent"
          @mouseleave="hideContent"
        >
          <div>
            <slot name="content" />
          </div>
        </div>
      </Transition>
    </template>

    <!-- 👉 Transition Component -->
    <template v-else>
      <Component :is="themeConfig.horizontalNav.transition">
        <div
          v-show="isContentShown"
          ref="refPopper"
          class="popper-content"
          :style="popperContentStyles"
          @mouseenter="showContent"
          @mouseleave="hideContent"
        >
          <div>
            <slot name="content" />
          </div>
        </div>
      </Component>
    </template>
    <!-- !SECTION -->
  </div>
</template>

<style lang="scss">
.popper-content {
  position: absolute;
}
</style>
