<script setup>
import NavBarI18n from "@app-insights360/@core/components/I18n.vue";
import { useThemeConfig } from "@app-insights360/@core/composable/useThemeConfig";

const { isAppRtl } = useThemeConfig();

const i18nCompLanguages = [
  {
    label: "English",
    i18nLang: "en",
  },
  {
    label: "French",
    i18nLang: "fr",
  },
  {
    label: "Arabic",
    i18nLang: "ar",
  },
];

const handleLangChange = (lang) => {
  isAppRtl.value = lang === "ar";
};
</script>

<template>
  <NavBarI18n :languages="i18nCompLanguages" @change="handleLangChange" />
</template>
