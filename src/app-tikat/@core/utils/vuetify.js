import { isDarkPreferred } from "@app-tikat/@core/composable/useThemeConfig";
import { themeConfig } from "@app-tikat/themeConfig.js";

export const resolveVuetifyTheme = () => {
  const storedTheme =
    localStorage.getItem(`${themeConfig.app.title}-theme`) ||
    themeConfig.app.theme.value;

  return storedTheme === "system"
    ? isDarkPreferred.value
      ? "dark"
      : "light"
    : storedTheme;
};
