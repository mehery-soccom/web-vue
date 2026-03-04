import "./preloader";
import { BootLoader } from "@/@common";
import appConfig from "@/app.config.js";

new BootLoader(appConfig).mount();
