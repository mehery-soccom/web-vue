<script>
import { useSkins } from "@app-insights360/@core/composable/useSkins";
import { defineComponent, h, resolveComponent } from "vue";
import { RouterView } from "vue-router";

export default defineComponent({
  setup() {
    // const routerView = resolveComponent("router-view");
    const { injectSkinClasses } = useSkins();

    // ℹ️ This will inject classes in body tag for accurate styling
    injectSkinClasses();

    return () =>
      h("div", { class: "layout-wrapper layout-blank" }, h(RouterView));
  },
});
</script>

<style>
.layout-wrapper.layout-blank {
  flex-direction: column;
}
</style>
