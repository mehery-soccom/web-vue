<script setup>
import { useSkins } from "@app-tikat/@core/composable/useSkins";
import { useThemeConfig } from "@app-tikat/@core/composable/useThemeConfig";

// @layouts plugin
import { AppContentLayoutNav } from "@app-tikat/@layouts/enums";

const DefaultLayoutWithHorizontalNav = defineAsyncComponent(() =>
  import("./components/DefaultLayoutWithHorizontalNav.vue")
);
const DefaultLayoutWithVerticalNav = defineAsyncComponent(() =>
  import("./components/DefaultLayoutWithVerticalNav.vue")
);
const { width: windowWidth } = useWindowSize();
const { appContentLayoutNav, switchToVerticalNavOnLtOverlayNavBreakpoint } =
  useThemeConfig();

// Remove below composable usage if you are not using horizontal nav layout in your app
switchToVerticalNavOnLtOverlayNavBreakpoint(windowWidth);

const { layoutAttrs, injectSkinClasses } = useSkins();

injectSkinClasses();
console.log("loading default");
</script>

<template>
  <template v-if="appContentLayoutNav === AppContentLayoutNav.Vertical">
    <DefaultLayoutWithVerticalNav v-bind="layoutAttrs" />
  </template>
  <template v-else>
    <DefaultLayoutWithHorizontalNav v-bind="layoutAttrs" />
  </template>
</template>

<style lang="scss">
// As we are using `layouts` plugin we need its styles to be imported
@use "@app-tikat/@layouts/styles/default-layout";
</style>
