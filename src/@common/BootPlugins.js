import "@/@iconify/icons-bundle";
import { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";
import { i18n } from "./services/i18n";
import store from "./store";
import DataService from "@common/services/DataService";
import tunnel from "@common/services/tunnel";
import formatters from "@common/services/formatters.js";

export default {
  install(app) {
    app.use(i18n);

    app.use(store);

    app.config.globalProperties.$toast = toast;

    app.config.globalProperties.$service = DataService;
    DataService.init(app);

    app.config.globalProperties.$tunnel = tunnel;

    app.config.globalProperties.$f = formatters;
    app.provide("formatters", formatters);
  },
};

/*

Options API >>
this.$service.getX('/api/users')


Composition API >>
import { getCurrentInstance } from 'vue'

const { proxy } = getCurrentInstance()
proxy.$service.getX('/api/users')


In any file >>
import { toast } from 'vue3-toastify'
toast('Simple toast')
toast.success('Success')
toast.error('Error occurred')
toast.info('Heads up')

*/
