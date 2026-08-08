<script setup>
import "@app-pushapp/@fake-db/db";

import "@app-pushapp/@core/scss/template/index.scss";
import "@app-pushapp/styles/styles.scss";
import "@/app-pushapp/assets/vue3-toastify.css";

import { loadFonts } from "@app-pushapp/plugins/webfontloader";
loadFonts();

import { useTheme } from "vuetify";

import ScrollToTop from "@app-pushapp/@core/components/ScrollToTop.vue";
import { useThemeConfig } from "@app-pushapp/@core/composable/useThemeConfig";

import { hexToRgb } from "@app-pushapp/@layouts/utils";
import SnackbarProvider from "@app-pushapp/plugins/SnackbarProvider.vue";

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
