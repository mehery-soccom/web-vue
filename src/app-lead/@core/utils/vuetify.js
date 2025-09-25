import { isDarkPreferred } from "@app-lead/@core/composable/useThemeConfig";
import { themeConfig } from "@app-lead/themeConfig.js";

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
