<script setup>
import "@app-tikat/@core/scss/template/index.scss";
import "@app-tikat/styles/styles.scss";

import { loadFonts } from "@app-tikat/plugins/webfontloader";
loadFonts();

import { useTheme } from "vuetify";
import { RouterView } from "vue-router";

import ScrollToTop from "@app-tikat/@core/components/ScrollToTop.vue";
import { useThemeConfig } from "@app-tikat/@core/composable/useThemeConfig";

import { hexToRgb } from "@app-tikat/@layouts/utils";
import SnackbarProvider from "@app-tikat/plugins/SnackbarProvider.vue";

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
