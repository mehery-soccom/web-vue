<script setup>
import "@app-notebook/@core/scss/template/index.scss";
import "@app-notebook/styles/styles.scss";

import { loadFonts } from "@app-notebook/plugins/webfontloader";
loadFonts();

import { useTheme } from "vuetify";

import ScrollToTop from "@app-notebook/@core/components/ScrollToTop.vue";
import { useThemeConfig } from "@app-notebook/@core/composable/useThemeConfig";

import { hexToRgb } from "@app-notebook/@layouts/utils";
import SnackbarProvider from "@app-notebook/plugins/SnackbarProvider.vue";

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
