<script setup>
import navItems from "@app-lead/navigation/vertical";
import { useThemeConfig } from "@app-lead/@core/composable/useThemeConfig";

// Components
import Footer from "@app-lead/layouts/components/Footer.vue";
// import NavBarI18n from '@app-lead/layouts/components/NavBarI18n.vue'
import NavbarThemeSwitcher from "@app-lead/layouts/components/NavbarThemeSwitcher.vue";
import UserProfile from "@app-lead/layouts/components/UserProfile.vue";

// @layouts plugin
import { VerticalNavLayout } from "@app-lead/@layouts";

const { appRouteTransition, isLessThanOverlayNavBreakpoint } = useThemeConfig();
const { width: windowWidth } = useWindowSize();
</script>

<template>
  <VerticalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          v-if="isLessThanOverlayNavBreakpoint(windowWidth)"
          id="vertical-nav-toggle-btn"
          class="ms-n3"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon size="26" icon="tabler-menu-2" />
        </IconBtn>

        <!-- <NavSearchBar class="ms-lg-n3" /> -->

        <VSpacer />

        <!-- <NavBarI18n class="me-1" /> -->
        <NavbarThemeSwitcher class="me-1" />
        <!-- <NavbarShortcuts class="me-1" />
        <NavBarNotifications class="me-2" /> -->
        <UserProfile />
      </div>
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
  </VerticalNavLayout>
</template>
