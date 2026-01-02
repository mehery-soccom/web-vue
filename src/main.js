import "./preloader";
if (window.CONST) window.CONST.APP = "phone";
import { BootLoader } from "@/@common";
import appConfig from "@/app.config.js";

new BootLoader(appConfig).mount();
