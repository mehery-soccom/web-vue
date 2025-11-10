import { BootRouter } from "@/@common";
import { CDN_CONTEXT } from "@/@common/constants";
import { routes } from "vue-router/auto-routes";
import AppForm from "@/app-form/AppForm.vue";
import LeadForm from "@/app-form/pages/LeadForm.vue";
import FormSuccess from "@/app-form/pages/FormSuccess.vue";

const baseRoutes = [
	{
		path: "/",
		component: AppForm,
		children: [
			{
				path: ":formId/:submissionId",
				name: "app-form-page",
				component: LeadForm,
				props: true,
				meta: { layout: "default" },
			},
			{
				path: ":formId/:submissionId/success",
				name: "app-form-success",
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
	app: "form",
	base: CDN_CONTEXT,
	routes: baseRoutes,
	autoRoutes: true,
	beforeEach: function (to, from, next) {
		console.log("[form] [router] beforeEach");
		next();
	},
});