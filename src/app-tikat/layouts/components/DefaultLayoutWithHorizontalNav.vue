<script setup>
import navItems from "@app-tikat/navigation/horizontal";
import { useThemeConfig } from "@app-tikat/@core/composable/useThemeConfig";
import { themeConfig } from "@app-tikat/themeConfig";

// Components
import Footer from "@app-tikat/layouts/components/Footer.vue";
// import NavBarI18n from '@app-tikat/layouts/components/NavBarI18n.vue'
import NavbarThemeSwitcher from "@app-tikat/layouts/components/NavbarThemeSwitcher.vue";
import UserProfile from "@app-tikat/layouts/components/UserProfile.vue";
import { HorizontalNavLayout } from "@app-tikat/@layouts";
import { VNodeRenderer } from "@app-tikat/@layouts/components/VNodeRenderer";

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
