<script setup>
import navItems from "@app-lead/navigation/horizontal";
import { useThemeConfig } from "@app-lead/@core/composable/useThemeConfig";
import { themeConfig } from "@app-lead/themeConfig";

// Components
import Footer from "@app-lead/layouts/components/Footer.vue";
// import NavBarI18n from '@app-lead/layouts/components/NavBarI18n.vue'
import NavbarThemeSwitcher from "@app-lead/layouts/components/NavbarThemeSwitcher.vue";
import UserProfile from "@app-lead/layouts/components/UserProfile.vue";
import { HorizontalNavLayout } from "@app-lead/@layouts";
import { VNodeRenderer } from "@app-lead/@layouts/components/VNodeRenderer";

const { appRouteTransition } = useThemeConfig();
</script>

<template>
  <HorizontalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar>
      <RouterLink to="/" class="app-logo d-flex align-center gap-x-3">
        <VNodeRenderer :nodes="themeConfig.app.logo" />

        <h1
          class="app-title font-weight-bold leading-normal text-xl text-capitalize"
        >
          {{ themeConfig.app.title }}
        </h1>
      </RouterLink>
      <VSpacer />

      <!-- <NavSearchBar trigger-btn-class="ms-lg-n3" /> -->

      <!-- <NavBarI18n class="me-1" /> -->
      <NavbarThemeSwitcher class="me-1" />
      <!-- <NavbarShortcuts class="me-1" />
      <NavBarNotifications class="me-2" /> -->
      <UserProfile />
    </template>

    <!-- 👉 Pages -->
    <RouterView v-slot="{ Component }">
      <Transition :name="appRouteTransition" mode="out-in">
        <Component :is="Component" />
      </Transition>
    </RouterView>

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <TheCustomizer />
  </HorizontalNavLayout>
</template>
