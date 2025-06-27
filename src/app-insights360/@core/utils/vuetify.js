import { isDarkPreferred } from "@app-insights360/@core/composable/useThemeConfig";
import { themeConfig } from "@app-insights360/themeConfig.js";

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
