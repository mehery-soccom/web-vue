<script setup>
import "@app-lead/@core/scss/template/index.scss";
import "@app-lead/styles/styles.scss";

import { loadFonts } from "@app-lead/plugins/webfontloader";
loadFonts();

import { useTheme } from "vuetify";

import ScrollToTop from "@app-lead/@core/components/ScrollToTop.vue";
import { useThemeConfig } from "@app-lead/@core/composable/useThemeConfig";

import { hexToRgb } from "@app-lead/@layouts/utils";
import SnackbarProvider from "@app-lead/plugins/SnackbarProvider.vue";

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
