import { createLayouts } from "@app-notebook/@layouts";
import "@app-notebook/@layouts/styles/index.scss";
import { layoutConfig } from "@app-notebook/themeConfig.js";

// ℹ️ We generate layout config from our themeConfig so you don't have to write config twice
export default createLayouts(layoutConfig);
