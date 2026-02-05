import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";
import AppNexuzForm from "@/app-nexuzForm/AppNexuzForm.vue";
import TikatForm from "@/app-nexuzForm/pages/TikatForm.vue";
import FormSuccess from "@/app-nexuzForm/pages/FormSuccess.vue";

const baseRoutes = [
    {
        path: "/", 
        component: AppNexuzForm,
        children: [
            {
                path: ":formId", 
                name: "nexuz-form-page",
                component: TikatForm,
                props: true,
                meta: { layout: "default" },
            },
            {
                path: ":formId/success",
                name: "nexuz-form-success",
                component: FormSuccess,
                props: true,
                meta: { layout: "default" },
            },
        ],
    },
];

if (!routes || routes?.length < 1) {
	console.log(
		"[form] [router] Auto-routing failed or is empty. Using fallback routes."
	);
}

export default BootRouter.route({
	app: "nexuzForm",
	base: CDN_CONTEXT,
	routes: baseRoutes,
	autoRoutes: true,
	beforeEach: function (to, from, next) {
        console.log("[nexuzform] [router] Navigating to:", to.name, "Path:", to.path);
        next();
    },
});