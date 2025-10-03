import { breakpointsVuetify } from "@vueuse/core";
import { VIcon } from "vuetify/components/VIcon";

import { defineThemeConfig } from "@app-lead/@core";
import { RouteTransitions, Skins } from "@app-lead/@core/enums";
import {
  AppContentLayoutNav,
  ContentWidth,
  FooterType,
  NavbarType,
} from "@app-lead/@layouts/enums";

// ❗ Logo SVG must be imported with ?raw suffix
import logo from "@app-lead/assets/images/logo.svg?raw";

export const { themeConfig, layoutConfig } = defineThemeConfig({
  app: {
    title: "Lead Management",
    // logo: h("div", {
    //   innerHTML: logo,
    //   style: "line-height:0; color: rgb(var(--v-global-theme-primary))",
    // }),
    contentWidth: ContentWidth.Boxed,
    contentLayoutNav: AppContentLayoutNav.Vertical,
    overlayNavFromBreakpoint: breakpointsVuetify.md + 16,
    // enableI18n: true,
    theme: "system",
    isRtl: false,
    skin: Skins.Default,
    routeTransition: RouteTransitions.Fade,
    iconRenderer: VIcon,
  },
  navbar: {
    type: NavbarType.Sticky,
    navbarBlur: true,
  },
  footer: { type: FooterType.Static },
  verticalNav: {
    isVerticalNavCollapsed: false,
    defaultNavItemIconProps: { icon: "tabler-circle", size: 10 },
    isVerticalNavSemiDark: false,
  },
  horizontalNav: {
    type: "sticky",
    transition: "slide-y-reverse-transition",
  },
  icons: {
    chevronDown: { icon: "tabler-chevron-down" },
    chevronRight: { icon: "tabler-chevron-right", size: 18 },
    close: { icon: "tabler-x" },
    verticalNavPinned: { icon: "tabler-circle-dot" },
    verticalNavUnPinned: { icon: "tabler-circle" },
    sectionTitlePlaceholder: { icon: "tabler-separator" },
  },
});
