import { createLayouts } from "@app-lead/@layouts";
import "@app-lead/@layouts/styles/index.scss";
import { layoutConfig } from "@app-lead/themeConfig.js";

// ℹ️ We generate layout config from our themeConfig so you don't have to write config twice
export default createLayouts(layoutConfig);
