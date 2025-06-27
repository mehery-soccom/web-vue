import { createLayouts } from "@app-insights360/@layouts";
import "@app-insights360/@layouts/styles/index.scss";
import { layoutConfig } from "@app-insights360/themeConfig.js";

// ℹ️ We generate layout config from our themeConfig so you don't have to write config twice
export default createLayouts(layoutConfig);
