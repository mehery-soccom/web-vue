<script setup>
import { toRef } from "vue";
import DynamicForm from "@/app-pushapp/views/admin/app-engagements/form/dynamicForm.vue";
import DynamicFieldEditor from "@/app-pushapp/components/DynamicFieldEditor.vue";
import NotificationPreviewApp from "@/app-pushapp/views/admin/push-notification/NotificationPreviewApp.vue";
import TemplatePresetSelector from "@/app-pushapp/views/admin/app-engagements/TemplatePresetSelector.vue";
// import popupStyle from "@/app-pushapp/views/admin/push-notification/previews/stylesForPreviews/PopupStyle";
// import popoverStyle from "@/app-pushapp/views/admin/push-notification/previews/stylesForPreviews/PopoverStyle";
// import popupScript from "@/app-pushapp/views/admin/push-notification/previews/jsForPreviews/PopupFunction";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { useAppEngagementsStore } from "@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore";

const required = (v) => !!v || "This field is required";

const { show } = inject("snackbar");

const props = defineProps({
  edit: { type: String },
  embedded: { type: Boolean, default: false },
});

const { TYPES, SUB_TYPES } = useAppEngagements();
const AppEngagementsStore = useAppEngagementsStore();

const route = useRoute();
const IS_PAGE = route.name?.includes("admin-app-engagements-templates-add");
const PARAM_ID = route.params.id;
const QUERY_COPY = route.query.t_copy;
const QUERY_EDIT = route.query.t_edit; // stop using

const router = useRouter();

const isLoading = ref(false);
const isPreStep = ref(true);
const activeTemplateTab = ref("tab-details");
const template = reactive({
  type: null,
  subType: null,
  desc: "",
  code: "",
  model: { data: [] },
  style: {
    code: "simple",
    title: "",
    message: "",
    category: null,

    image_url: "",
    logo_url: "",
    button1_url: "",
    button2_url: "",

    /** styled */
    line_1: "",
    line_2: "",
    line_3: "",
    line1_font_size: null,
    line2_font_size: null,
    line3_font_size: null,
    line1_font_color: "",
    line2_font_color: "",
    line3_font_color: "",
    bg_color: "",
    bg_color_gradient: "",
    bg_color_gradient_dir: null,
    button1_bg_color: "",
    button1_font_color: "",
    button2_bg_color: "",
    button2_font_color: "",
    progress_color: "",
    align: "left",

    /** roadblock */
    height: "",
    width: "",
    btn: [],
  },
});
const view = ref({
  platform: "ios",
  mode: "collapse",
  appearance: "light",
});
const templatePreview = computed(() => {
  return {
    view: view.value,
    ...template,
    // options: {
    //   buttons: template.buttonGroupFields.value,
    // },
  };
});
const availableSubTypes = computed(() =>
  SUB_TYPES.filter((sub) => sub.type === template.type)
);
const formFields = computed(() => {
  const matched = SUB_TYPES.find(
    (s) =>
      (template.subType &&
        s.value === template.subType &&
        s.type === template.type) ||
      (!template.subType && s.value === template.type)
  );
  return matched?.form?.fields ?? [];
});
const formRef = ref();
const formRefVersion = ref(1);
const isInitialLoad = ref(true);

function onFormUpdate(updated) {
  Object.assign(template, updated);
  // console.log('[Parent] got update:', template.style)
}
const submit = async () => {
  let validationResult = await formRef.value.validate();
  console.log("val res", validationResult);

  if (!validationResult.valid) {
    return;
  }

  if (PARAM_ID) await onUpdate();
  else await onCreate();
  console.log(
    "valid form",
    formRef.value,
    template,
    JSON.stringify(template, null, 2)
  );
};
const deleteFromPayload = (template) => {
  delete template.createdAt;
  delete template.updatedAt;
  delete template._id;
  delete template.__v;
};
const createPayload = () => {
  if (template.view) delete template.view;
  return {
    ...template,
  };
};
const notificationPreviewRef = ref(null);
async function saveTemplateHtml() {
  await nextTick();
  const baseType = template.type
    .replace(/-/g, "")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
  const refName = `${baseType}PreviewRef`;
  let popStyle, popScript;

  try {
    const { default: style } = await import(
      `@/app-pushapp/views/admin/push-notification/previews/stylesForPreviews/${baseType}Style`
    );
    popStyle = style;
  } catch {
    popStyle = "";
  }

  try {
    const { popScript: script } = await import(
      `@/app-pushapp/views/admin/push-notification/previews/jsForPreviews/${baseType}Function`
    );
    popScript = script;
  } catch {
    popScript = "";
  }

  if (notificationPreviewRef.value?.[refName]?.$el) {
    const el = notificationPreviewRef.value[refName].$el;
    let html = el.outerHTML;
    html = html.replace(
      /<video/g,
      '<video muted="" webkit-playsinline="" preload="auto" playsinline=""'
    );

    template.style.html = `
      <!DOCTYPE html>
      <html lang="en"> 
        <head>
          <meta charset="UTF-8"> 
          <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
          <title></title> 
          <style> ${popStyle}</style>
        </head>
        <body>
          ${html}
          ${popScript}
        </body>
      </html>`;
  }
}

const onUpdate = async () => {
  try {
    isLoading.value = true;
    let payload = createPayload();
    await saveTemplateHtml();
    template.style.code = template.subType || template.type;
    await AppEngagementsStore.updateTemplate(template._id, payload);
    show({ message: "Template updated successfully", color: "success" });
    router.push({ name: "admin-app-engagements-templates-list" });
  } catch (error) {
    console.error(error);
    show({
      message: error?.response?.data?.errorMsg
        ? error.response.data.errorMsg
        : error,
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};
const _onUpdate = async () => {
  try {
    isLoading.value = true;
    let payload = createPayload();
    await saveTemplateHtml();
    template.style.code = template.subType || template.type;
    let res = await AppEngagementsStore.updateTemplate(template._id, payload);
    return res.data;
  } catch (error) {
    console.error(error);
    show({
      message: error?.response?.data?.errorMsg
        ? error.response.data.errorMsg
        : error,
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};
const onCreate = async () => {
  try {
    isLoading.value = true;
    let payload = createPayload();
    deleteFromPayload(payload);
    await saveTemplateHtml();
    template.style.code = template.subType || template.type;
    await AppEngagementsStore.createTemplate(payload);
    show({ message: "Template created successfully", color: "success" });
    router.push({ name: "admin-app-engagements-templates-list" });
  } catch (error) {
    console.error(error);
    show({
      message: error?.response?.data?.errorMsg
        ? error.response.data.errorMsg
        : error,
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

const _onCreate = async () => {
  try {
    isLoading.value = true;
    let payload = createPayload();
    deleteFromPayload(payload);
    await saveTemplateHtml();
    let res = await AppEngagementsStore.createTemplate(payload);
    return res.data;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    isLoading.value = false;
  }
};
const saveTemplate = async () => {
  if (template._id) {
    return await _onUpdate();
  }
  return await _onCreate();
};

const isValid = async () => {
  let validationResult = await formRef.value?.validate();

  if (!validationResult?.valid) {
    return false;
  }

  return true;
};

const sanitizeAndUnderscore = (str) => {
  return str.replace(/[^\w\s]/g, "").replace(/\s+/g, "_");
};
const fetchDetails = async (val, isCopy = false) => {
  AppEngagementsStore.fetchTemplate({ id: val })
    .then(async (response) => {
      const _template = response.data.data;
      Object.assign(template, {
        ...template,
        ..._template,
      });
      await nextTick();
      if (isCopy) template.desc = "";
      isInitialLoad.value = false;
      // isPreStep.value = false;
    })
    .catch((error) => {
      console.log(error);
      show({
        message: error?.response?.data?.errorMsg
          ? error.response.data.errorMsg
          : error,
        color: "error",
      });
    });
};

onMounted(async () => {
  if (PARAM_ID || QUERY_COPY || QUERY_EDIT) isPreStep.value = false;
  if (PARAM_ID) await fetchDetails(PARAM_ID);
  else if (QUERY_EDIT) await fetchDetails(QUERY_EDIT);
  else {
    if (QUERY_COPY) await fetchDetails(QUERY_COPY, true);
    else isInitialLoad.value = false;
  }
});
function goToPreStep() {
  isPreStep.value = true;
}
function onPresetSelect({ type, subType }) {
  template.type = type;
  template.subType = subType;
  isPreStep.value = false;
}
async function handlePreviewTemplate(templateFromPreview) {
  isInitialLoad.value = true;
  Object.assign(template, structuredClone(templateFromPreview));
  isPreStep.value = false;
  await nextTick();
  isInitialLoad.value = false;
}

watch(
  () => template.type,
  (val) => {
    formRefVersion.value += 1;
    if (!isInitialLoad.value) template.subType = null;
  }
);

watch(
  () => template.subType,
  (val) => {
    formRefVersion.value += 1;
    if (val) template.style.code = val;
    else template.style.code = null;
  }
);

watch(
  () => template.desc,
  (val) => {
    template.code = sanitizeAndUnderscore(val);
  }
);

watch(
  () => props.edit,
  (val) => {
    console.log("props.edit updated", val);
    // fetch full template and set state
  },
  { immediate: true }
);

defineExpose({ isValid, _onCreate, _onUpdate, saveTemplate });
</script>

<template>
  <v-row v-if="isPreStep">
    <v-col cols="12" md="12">
      <TemplatePresetSelector
        @select="onPresetSelect"
        :embedded="embedded"
        @selectTemplate="handlePreviewTemplate"
      />
    </v-col>
  </v-row>
  <div v-else style="display: flex">
    <v-row style="display: flex; flex: 1">
      <v-col
        v-if="!isPreStep"
        cols="12"
        md="8"
        style="overflow-y: auto; max-height: 100%; padding-right: 16px"
      >
        <v-card>
          <v-row
            class="align-center justify-space-between"
            style="margin: 16px"
          >
            <v-col class="pa-0" cols="auto">
              <div>
                <div class="text-h6">
                  {{ PARAM_ID ? "Edit" : QUERY_EDIT ? "" : "Create" }} Template
                </div>
                <div class="text-subtitle-2">
                  This template will be used for In-App Engagements
                </div>
              </div>
            </v-col>
            <v-col
              class="pa-0"
              cols="auto"
              v-if="!(PARAM_ID || QUERY_COPY || QUERY_EDIT)"
            >
              <v-btn variant="outlined" color="primary" @click="goToPreStep">
                ← Back to pre step
              </v-btn>
            </v-col>
          </v-row>
          <!-- <v-card-item class="pb-0">
            <v-card-title>Create Template</v-card-title>
            <v-card-subtitle
              >This template will be used for sending Push
              Notification</v-card-subtitle
            >
          </v-card-item> -->

          <VTabs v-model="activeTemplateTab">
            <VTab value="tab-details"> Details </VTab>
            <VTab value="tab-variables"> Variables </VTab>
          </VTabs>

          <VCard flat>
            <VCardText>
              <VWindow
                v-model="activeTemplateTab"
                class="disable-tab-transition"
              >
                <VWindowItem value="tab-details">
                  <div>
                    <VForm ref="formRef" :key="formRefVersion">
                      <VRow>
                        <VCol cols="12" md="6">
                          <AppSelect
                            v-model="template.type"
                            :items="TYPES"
                            label="Type"
                            disabled
                            item-title="label"
                            item-value="value"
                            :rules="[required]"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <AppSelect
                            v-if="
                              availableSubTypes.length > 1 ||
                              (availableSubTypes.length === 1 &&
                                availableSubTypes[0].value !== template.type)
                            "
                            v-model="template.subType"
                            disabled
                            item-title="label"
                            item-value="value"
                            :items="availableSubTypes"
                            :rules="
                              availableSubTypes.length > 1 ||
                              (availableSubTypes.length === 1 &&
                                availableSubTypes[0].value !== template.type)
                                ? [required]
                                : []
                            "
                            label="Subtype"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <AppTextField
                            v-model="template.desc"
                            label="Template Name"
                            placeholder="Enter name"
                            :rules="[required]"
                            :disabled="!!(PARAM_ID || QUERY_EDIT)"
                            prepend-inner-icon="mdi-text-box"
                          />
                        </VCol>
                      </VRow>
                      <VDivider class="mt-4 mb-4" v-if="formFields.length" />
                      <DynamicForm
                        :formData="template"
                        :fields="formFields"
                        @update:formData="onFormUpdate"
                      />
                    </VForm>
                  </div>
                </VWindowItem>

                <VWindowItem value="tab-variables">
                  <VRow>
                    <VCol cols="12" md="12">
                      <DynamicFieldEditor
                        v-model="template.model"
                        :fields="[
                          toRef(template.style, 'title'),
                          toRef(template.style, 'message'),
                          toRef(template.style, 'line_1'),
                          toRef(template.style, 'line_2'),
                          toRef(template.style, 'line_3'),
                        ]"
                        :dynamic-prefixes="['data']"
                      />
                    </VCol>
                  </VRow>
                </VWindowItem>
              </VWindow>
            </VCardText>
            <template v-if="IS_PAGE">
              <VDivider />
              <VCardText class="d-flex gap-4">
                <VBtn :disabled="isLoading" @click="submit">{{
                  isLoading ? "loading..." : PARAM_ID ? "Update" : "Create"
                }}</VBtn>
                <VBtn
                  variant="outlined"
                  color="secondary"
                  :to="{ name: 'admin-app-engagements-templates-list' }"
                >
                  Cancel
                </VBtn>
              </VCardText>
            </template>
          </VCard>
        </v-card>
      </v-col>

      <!-- Preview Column -->
      <VCol v-if="!isPreStep" cols="12" md="4" style="margin-top: 13px">
        <VRow style="height: 100%; max-height: 550px">
          <v-col cols="12" class="d-flex justify-center pt-0">
            <NotificationPreviewApp
              :template="templatePreview"
              ref="notificationPreviewRef"
            />
          </v-col>
        </VRow>
      </VCol>
    </v-row>
  </div>
</template>

<style scoped lang="scss"></style>
