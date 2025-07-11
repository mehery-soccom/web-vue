import { isDarkPreferred } from "@app-notebook/@core/composable/useThemeConfig";
import { themeConfig } from "@app-notebook/themeConfig.js";

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
