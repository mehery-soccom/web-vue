import { createLayouts } from "@app-tikat/@layouts";
import "@app-tikat/@layouts/styles/index.scss";
import { layoutConfig } from "@app-tikat/themeConfig.js";

// ℹ️ We generate layout config from our themeConfig so you don't have to write config twice
export default createLayouts(layoutConfig);
