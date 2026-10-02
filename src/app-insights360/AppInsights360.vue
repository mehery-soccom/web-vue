<script setup>
import "@app-insights360/@core/scss/template/index.scss";
import "@app-insights360/styles/styles.scss";
import "@app-insights360/assets/vue3-toastify.css"

import { loadFonts } from "@app-insights360/plugins/webfontloader";
loadFonts();

import { useTheme } from "vuetify";

import ScrollToTop from "@app-insights360/@core/components/ScrollToTop.vue";
import { useThemeConfig } from "@app-insights360/@core/composable/useThemeConfig";

import { hexToRgb } from "@app-insights360/@layouts/utils";
import SnackbarProvider from "@app-insights360/plugins/SnackbarProvider.vue";

const {
  syncInitialLoaderTheme,
  syncVuetifyThemeWithTheme: syncConfigThemeWithVuetifyTheme,
  isAppRtl,
  handleSkinChanges,
} = useThemeConfig();

const { global } = useTheme();

// ℹ️ Sync current theme with initial loader theme
syncInitialLoaderTheme();
syncConfigThemeWithVuetifyTheme();
handleSkinChanges();
</script>

<template>
  <VLocaleProvider :rtl="isAppRtl">
    <!-- ℹ️ This is required to set the background color of active nav link based on currently active global theme's primary -->
    <SnackbarProvider>
      <VApp
        :style="`--v-global-theme-primary: ${hexToRgb(
          global.current.value.colors.primary
        )}`"
      >
        <RouterView />
        <ScrollToTop />
      </VApp>
    </SnackbarProvider>
  </VLocaleProvider>
</template>
