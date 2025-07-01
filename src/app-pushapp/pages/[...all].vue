<script setup>
import { useGenerateImageVariant } from "@app-pushapp/@core/composable/useGenerateImageVariant";
import misc404 from "@app-pushapp/assets/images/pages/404.png";
import miscMaskDark from "@app-pushapp/assets/images/pages/misc-mask-dark.png";
import miscMaskLight from "@app-pushapp/assets/images/pages/misc-mask-light.png";

const authThemeMask = useGenerateImageVariant(miscMaskLight, miscMaskDark);
</script>

<template>
  <div class="misc-wrapper">
    <ErrorHeader
      error-title="Page Not Found :("
      error-description="We couldn't find the page you are looking for."
    />
    <VBtn to="/" class="mb-12"> Back to Home </VBtn>

    <!-- 👉 Image -->
    <div class="misc-avatar w-100 text-center">
      <VImg :src="misc404" alt="Coming Soon" :max-width="200" class="mx-auto" />
    </div>

    <VImg :src="authThemeMask" class="misc-footer-img d-none d-md-block" />
  </div>
</template>

<style lang="scss">
@use "@app-pushapp/@core/scss/template/pages/misc.scss";
</style>

<route lang="yaml">
meta:
  layout: "blank"
</route>
